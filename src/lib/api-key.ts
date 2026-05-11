import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const PREFIX = "chat_sk_";

/** Genera una API key nueva y su hash para guardar en DB */
export function generateApiKey(): { plain: string; hash: string } {
  const plain = PREFIX + randomBytes(24).toString("hex");
  const hash = hashKey(plain);
  return { plain, hash };
}

/** SHA-256 del key para comparar contra lo guardado en DB */
export function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/** Valida una API key entrante. Retorna el userId si es válida y activa */
export async function validateApiKey(plain: string): Promise<string | null> {
  if (!plain.startsWith(PREFIX)) return null;
  const hash = hashKey(plain);

  const record = await prisma.aPIKey.findUnique({
    where: { key: hash },
    select: { id: true, userId: true, active: true },
  });

  if (!record || !record.active) return null;

  // Actualizar lastUsed sin bloquear la respuesta
  prisma.aPIKey.update({
    where: { id: record.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return record.userId;
}
