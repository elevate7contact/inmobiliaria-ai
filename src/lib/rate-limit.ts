// src/lib/rate-limit.ts
// Rate limiting para /api/chat usando Postgres (sin Redis).
// Cuenta mensajes USER en ventanas deslizantes por sessionId y por clientIp.

import { prisma } from "@/lib/prisma";

const PER_SESSION_PER_MIN = 20;
const PER_SESSION_PER_DAY = 200;
const PER_IP_PER_MIN = 40;

export async function checkChatRateLimit({
  sessionId,
  clientIp,
}: {
  sessionId: string;
  clientIp: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const now = Date.now();
  const oneMinAgo = new Date(now - 60_000);
  const oneDayAgo = new Date(now - 24 * 60 * 60_000);

  // Cap por sessionId — última hora corta (60s)
  const sessionMinCount = await prisma.chatMessage.count({
    where: {
      role: "USER",
      createdAt: { gte: oneMinAgo },
      conversation: { sessionId },
    },
  });
  if (sessionMinCount >= PER_SESSION_PER_MIN) {
    return { ok: false, reason: "session_per_minute" };
  }

  // Cap por sessionId — 24h
  const sessionDayCount = await prisma.chatMessage.count({
    where: {
      role: "USER",
      createdAt: { gte: oneDayAgo },
      conversation: { sessionId },
    },
  });
  if (sessionDayCount >= PER_SESSION_PER_DAY) {
    return { ok: false, reason: "session_per_day" };
  }

  // Cap por IP — 60s. Se cuenta sobre ChatMessage USER cuyas conversaciones tengan esta IP.
  if (clientIp) {
    const ipMinCount = await prisma.chatMessage.count({
      where: {
        role: "USER",
        createdAt: { gte: oneMinAgo },
        conversation: { clientIp },
      },
    });
    if (ipMinCount >= PER_IP_PER_MIN) {
      return { ok: false, reason: "ip_per_minute" };
    }
  }

  return { ok: true };
}
