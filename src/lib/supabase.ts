/**
 * Supabase client — usado para Storage (subida de fotos de propiedades, logos
 * de inmobiliarias) y queries directas cuando Prisma no encaja.
 *
 * IMPORTANTE: el AUTH del proyecto NO usa Supabase Auth. Usamos custom auth
 * con bcrypt + JWT (ver src/lib/session.ts y src/app/actions/auth.ts).
 * Razón: el schema Prisma tiene User.passwordHash propio y el plan del Sprint
 * pide control total del flujo (multi-rol, países, etc).
 *
 * Hay 2 clientes:
 *  - browserClient: usar en componentes 'use client'. Solo anon key.
 *  - serverClient:  usar en Server Components, Server Actions, route handlers.
 *                   Acepta service role key para operaciones admin (storage upload).
 */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _serverClient: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan. Revisá .env.example.'
    );
  }

  _serverClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serverClient;
}
