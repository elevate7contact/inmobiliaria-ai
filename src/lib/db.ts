/**
 * Prisma client singleton — único punto de entrada a la DB.
 *
 * En dev hot-reload Next.js puede recrear el módulo varias veces. Sin singleton
 * eso abre N conexiones nuevas a Postgres y termina rompiendo el pool.
 * Pattern recomendado por la doc oficial de Prisma para Next.js.
 */
import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no está definida. Copiá .env.example a .env y rellená las credenciales de Supabase.'
    );
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
