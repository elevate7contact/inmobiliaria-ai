// src/app/api/chat/health/route.ts
// Endpoint de diagnóstico del agente Vistaagent.
// Chequea: API key, tablas de chat, columna FTS, propiedades disponibles.
// Uso: GET /api/chat/health?diag=athora2026
// Devuelve JSON claro con qué está OK y qué está roto. Sin exponer secretos.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DIAG_KEY = "athora2026";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("diag") !== DIAG_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const checks: Record<string, string> = {};

  // 1 · ANTHROPIC_API_KEY
  const key = process.env.ANTHROPIC_API_KEY;
  checks.anthropicKey = key
    ? `OK · ANTHROPIC_API_KEY presente (${key.length} chars)`
    : "FALLA · ANTHROPIC_API_KEY no está configurada en Vercel — el agente no puede responder";

  // 2 · Tabla ChatConversation
  try {
    const n = await prisma.chatConversation.count();
    checks.chatConversation = `OK · ChatConversation accesible (${n} registros)`;
  } catch (e) {
    checks.chatConversation =
      "FALLA · tabla ChatConversation no existe — la migración add_ai_assistant NO corrió en producción. " +
      truncErr(e);
  }

  // 3 · Tabla ChatMessage
  try {
    const n = await prisma.chatMessage.count();
    checks.chatMessage = `OK · ChatMessage accesible (${n} registros)`;
  } catch (e) {
    checks.chatMessage = "FALLA · tabla ChatMessage no existe. " + truncErr(e);
  }

  // 4 · Tabla UserPreferenceProfile
  try {
    const n = await prisma.userPreferenceProfile.count();
    checks.userPreferenceProfile = `OK · UserPreferenceProfile accesible (${n} registros)`;
  } catch (e) {
    checks.userPreferenceProfile =
      "FALLA · tabla UserPreferenceProfile no existe. " + truncErr(e);
  }

  // 5 · Columna FTS searchVector (vía information_schema — no deserializa el tsvector)
  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ChatMessage' AND column_name = 'searchVector'
      ) AS exists`;
    checks.ftsColumn = rows[0]?.exists
      ? "OK · columna searchVector existe (recall semántico activo)"
      : "FALLA · columna searchVector no existe — la migración chat_message_fts NO corrió";
  } catch (e) {
    checks.ftsColumn = "FALLA · no se pudo verificar columna FTS. " + truncErr(e);
  }

  // 6 · Propiedades disponibles para sugerir
  try {
    const active = await prisma.property.count({ where: { status: "ACTIVE" } });
    checks.activeProperties =
      active > 0
        ? `OK · ${active} propiedades ACTIVE para que el agente recomiende`
        : "ADVERTENCIA · 0 propiedades ACTIVE — el agente no tiene nada que sugerir aunque funcione";
  } catch (e) {
    checks.activeProperties = "FALLA · no se pudo contar propiedades. " + truncErr(e);
  }

  // 7 · Países / ciudades (para que el agente filtre)
  try {
    const countries = await prisma.country.count();
    const cities = await prisma.city.count();
    checks.geo = `OK · ${countries} países, ${cities} ciudades cargadas`;
  } catch (e) {
    checks.geo = "FALLA · no se pudo leer geografía. " + truncErr(e);
  }

  const values = Object.values(checks);
  const hasFalla = values.some((v) => v.startsWith("FALLA"));
  const hasAdvertencia = values.some((v) => v.startsWith("ADVERTENCIA"));
  const status = hasFalla ? "ROTO" : hasAdvertencia ? "FUNCIONAL_CON_ADVERTENCIAS" : "OK";

  return NextResponse.json(
    {
      status,
      resumen:
        status === "ROTO"
          ? "El chat NO va a funcionar. Mira los checks con FALLA abajo."
          : status === "FUNCIONAL_CON_ADVERTENCIAS"
          ? "El chat puede responder pero hay advertencias (ej: sin propiedades cargadas)."
          : "Todo en orden. Si el chat falla igual, es problema de sesión/cookies del usuario.",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

function truncErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.slice(0, 150);
}
