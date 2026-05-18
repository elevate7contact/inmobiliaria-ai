// src/app/api/chat/route.ts
// Endpoint del asistente Athora Casa. Agentic loop con tool use.
// Streaming SSE de la respuesta final al cliente.
// Persiste turnos USER/ASSISTANT/TOOL en ChatMessage para auditoría + memoria.

import type { NextRequest } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // necesitamos Node, no Edge (Prisma)

const MODEL = "claude-sonnet-4-5";
const MAX_TOOL_LOOPS = 5; // tope de iteraciones de tool use
const MAX_TOKENS = 1024;

type ChatRequest = {
  sessionId: string; // UUID del browser para anónimos
  conversationId?: string; // si continúa una conversación existente
  message: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    if (!body.message?.trim()) {
      return new Response(JSON.stringify({ error: "message vacío" }), { status: 400 });
    }
    if (!body.sessionId) {
      return new Response(JSON.stringify({ error: "sessionId requerido" }), { status: 400 });
    }

    // Identificar al usuario si está logueado
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Buscar o crear conversación
    let conversation;
    if (body.conversationId) {
      conversation = await prisma.chatConversation.findUnique({
        where: { id: body.conversationId },
      });
    }
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: { sessionId: body.sessionId, userId },
      });
    }

    // Cargar historial previo (últimos 20 turnos para no inflar tokens)
    const previousMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // Persistir el mensaje del usuario
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: body.message,
      },
    });

    // Cargar preferencias persistidas para enriquecer el contexto
    let userContext = "";
    if (userId) {
      const prefs = await prisma.userPreferenceProfile.findUnique({ where: { userId } });
      if (prefs) {
        userContext = `\n\n## Contexto previo del usuario\n${JSON.stringify(
          {
            budgetMin: prefs.budgetMin,
            budgetMax: prefs.budgetMax,
            currency: prefs.currency,
            neighborhoods: prefs.neighborhoods,
            minBedrooms: prefs.minBedrooms,
            minBathrooms: prefs.minBathrooms,
            propertyTypes: prefs.propertyTypes,
            services: prefs.services,
            features: prefs.features,
            freeNotes: prefs.freeNotes,
          },
          null,
          2
        )}`;
      }
    }

    // Construir messages para Anthropic
    const messages: Anthropic.MessageParam[] = [];
    for (const m of previousMessages) {
      if (m.role === "USER") {
        messages.push({ role: "user", content: m.content });
      } else if (m.role === "ASSISTANT") {
        messages.push({ role: "assistant", content: m.content });
      }
      // TOOL messages se omiten del historial visible — su efecto ya está en el contexto
    }
    messages.push({ role: "user", content: body.message });

    // Agentic loop con tool use
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          let finalText = "";
          const propertyIdsCited: string[] = [];
          let totalTokensIn = 0;
          let totalTokensOut = 0;

          for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
            const response = await anthropic.messages.create({
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: SYSTEM_PROMPT + userContext,
              tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
              messages,
            });

            totalTokensIn += response.usage.input_tokens;
            totalTokensOut += response.usage.output_tokens;

            // Si terminó sin tool calls → emitir texto final
            if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
              for (const block of response.content) {
                if (block.type === "text") {
                  finalText += block.text;
                  send({ type: "text", value: block.text });
                }
              }
              break;
            }

            if (response.stop_reason !== "tool_use") {
              // edge case: max_tokens. Devolvemos lo que haya.
              for (const block of response.content) {
                if (block.type === "text") {
                  finalText += block.text;
                  send({ type: "text", value: block.text });
                }
              }
              break;
            }

            // Procesar tool calls
            messages.push({ role: "assistant", content: response.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
              if (block.type === "tool_use") {
                send({ type: "tool_call", name: block.name, input: block.input });

                const result = await executeTool(
                  block.name,
                  block.input as Record<string, unknown>,
                  userId
                );

                // Persistir tool call
                await prisma.chatMessage.create({
                  data: {
                    conversationId: conversation.id,
                    role: "TOOL",
                    content: block.name,
                    toolName: block.name,
                    toolInput: block.input as object,
                    toolOutput: result as object,
                  },
                });

                // Capturar propertyIds citados
                if (
                  block.name === "search_properties" &&
                  result &&
                  typeof result === "object" &&
                  "properties" in result
                ) {
                  const props = (result as { properties: { id: string }[] }).properties;
                  propertyIdsCited.push(...props.map((p) => p.id));
                }

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              }
            }

            messages.push({ role: "user", content: toolResults });
          }

          // Persistir respuesta final del asistente
          await prisma.chatMessage.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: finalText,
              propertyIds: propertyIdsCited,
              tokensIn: totalTokensIn,
              tokensOut: totalTokensOut,
            },
          });

          send({
            type: "done",
            conversationId: conversation.id,
            propertyIds: propertyIdsCited,
          });
        } catch (err) {
          console.error("[chat] stream error:", err);
          send({ type: "error", message: "Algo se rompió. Intentá de nuevo." });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat] error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
}
