"use client";
// src/components/chat/ChatWidget.tsx
// Floating chat button + drawer. SSE client. Anti-flicker streaming.
// Persiste sessionId + conversationId en localStorage para continuidad.

import { useEffect, useRef, useState, useCallback } from "react";
import { PropertyCard, type PropertyCardData } from "./PropertyCard";

type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; properties?: PropertyCardData[] }
  | { id: string; role: "tool"; name: string };

const STORAGE_KEYS = {
  sessionId: "athora_chat_session_id",
  conversationId: "athora_chat_conversation_id",
};

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEYS.sessionId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.sessionId, id);
  }
  return id;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Init session + saludo
  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;
    const stored = localStorage.getItem(STORAGE_KEYS.conversationId);
    if (stored) setConversationId(stored);
    setMessages([
      {
        id: "greet",
        role: "assistant",
        text: "Hola, soy Athora Casa. ¿En qué ciudad estás buscando y para qué tipo de plan?",
      },
    ]);
  }, [open, messages.length]);

  // Auto-scroll al final
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const propsBuffer: PropertyCardData[] = [];

    setMessages((m) => [
      ...m,
      { id: userId, role: "user", text },
      { id: assistantId, role: "assistant", text: "" },
    ]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getOrCreateSessionId(),
          conversationId,
          message: text,
        }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (!frame.startsWith("data: ")) continue;
          let payload: { type: string; [k: string]: unknown };
          try {
            payload = JSON.parse(frame.slice(6));
          } catch {
            continue;
          }
          if (payload.type === "text") {
            const chunk = String(payload.value ?? "");
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId && msg.role === "assistant"
                  ? { ...msg, text: msg.text + chunk }
                  : msg
              )
            );
          } else if (payload.type === "tool_call") {
            const name = String(payload.name ?? "");
            setMessages((m) => [
              ...m.filter((x) => !(x.role === "tool" && x.name === name)),
              { id: crypto.randomUUID(), role: "tool", name },
            ]);
            // Si search_properties, en el done viene la lista — pre-cargamos vacío.
          } else if (payload.type === "done") {
            const cid = String(payload.conversationId ?? "");
            if (cid) {
              setConversationId(cid);
              localStorage.setItem(STORAGE_KEYS.conversationId, cid);
            }
            // Fetch property cards si vinieron IDs
            const ids = (payload.propertyIds as string[]) ?? [];
            if (ids.length) {
              try {
                const r = await fetch(`/api/properties/batch?ids=${ids.join(",")}`);
                if (r.ok) {
                  const data = (await r.json()) as { properties: PropertyCardData[] };
                  propsBuffer.push(...data.properties);
                }
              } catch {
                /* silencioso */
              }
            }
            setMessages((m) =>
              m
                .filter((x) => x.role !== "tool")
                .map((msg) =>
                  msg.id === assistantId && msg.role === "assistant"
                    ? { ...msg, properties: propsBuffer.length ? propsBuffer : undefined }
                    : msg
                )
            );
          } else if (payload.type === "error") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId && msg.role === "assistant"
                  ? { ...msg, text: String(payload.message ?? "Algo salió mal.") }
                  : msg
              )
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId && msg.role === "assistant"
              ? { ...msg, text: "Se cortó la conexión. Intentá de nuevo." }
              : msg
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, conversationId]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    localStorage.removeItem(STORAGE_KEYS.conversationId);
    setConversationId(null);
    setMessages([]);
    setStreaming(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-white shadow-lg shadow-orange-500/40 transition hover:scale-105 hover:bg-orange-600 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Abrir asistente"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-sm font-medium">Athora Casa</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/30 backdrop-blur-sm"
          />
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  A
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Athora Casa</div>
                  <div className="text-xs text-gray-500">
                    {streaming ? "escribiendo…" : "asistente de búsqueda"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={reset}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Nueva conversación"
                  aria-label="Reiniciar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                if (m.role === "tool") {
                  const label =
                    m.name === "search_properties"
                      ? "Buscando propiedades…"
                      : m.name === "get_property_details"
                      ? "Cargando ficha…"
                      : m.name === "save_user_preference"
                      ? "Guardando preferencia…"
                      : "Procesando…";
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                      {label}
                    </div>
                  );
                }
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-500 px-4 py-2 text-sm text-white">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex flex-col gap-2">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2 text-sm text-gray-900">
                      {m.text || (streaming ? "…" : "")}
                    </div>
                    {m.properties && m.properties.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {m.properties.map((p) => (
                          <PropertyCard key={p.id} data={p} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Escribí lo que buscás…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Enviar
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                IA en beta · datos de propiedades en tiempo real
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
