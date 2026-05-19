// src/lib/ai/semantic-recall.ts
// Recall semántico de turnos pasados via Postgres full-text search.
// Busca mensajes relevantes en OTRAS conversaciones del mismo usuario
// para inyectarlos como "recuerdos" al contexto del asistente.

import { prisma } from "@/lib/prisma";

export type RecalledMessage = {
  role: string;
  content: string;
  createdAt: Date;
};

/**
 * Trae los `limit` mensajes más relevantes (por ts_rank) de conversaciones
 * pasadas del mismo `userId`, excluyendo la conversación actual.
 *
 * Si `query` es muy corto o no hay matches, devuelve []. La sanitización
 * la hace `plainto_tsquery` — siempre pasamos `query` como parámetro.
 */
export async function recallRelevantMessages(
  conversationId: string,
  userId: string,
  query: string,
  limit = 5
): Promise<RecalledMessage[]> {
  const trimmed = query.trim();
  if (trimmed.length < 4) return [];

  try {
    const rows = await prisma.$queryRaw<RecalledMessage[]>`
      SELECT m."role"::text AS role,
             m."content"    AS content,
             m."createdAt"  AS "createdAt"
      FROM "ChatMessage" m
      JOIN "ChatConversation" c ON c."id" = m."conversationId"
      WHERE c."userId" = ${userId}
        AND m."conversationId" != ${conversationId}
        AND m."role" IN ('USER', 'ASSISTANT')
        AND m."searchVector" @@ plainto_tsquery('spanish', ${trimmed})
      ORDER BY ts_rank(m."searchVector", plainto_tsquery('spanish', ${trimmed})) DESC
      LIMIT ${limit}
    `;
    return rows;
  } catch (err) {
    // FTS opcional: si la columna aún no existe (migración no corrida) seguimos sin recall.
    console.warn("[semantic-recall] fallo en recall, sigo sin recuerdos:", err);
    return [];
  }
}
