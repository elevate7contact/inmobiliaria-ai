// src/lib/supabase/admin.ts
// Cliente Supabase con privilegios de servicio (service-role).
// SERVER-SIDE ONLY. Nunca importar en componentes cliente.
// Usar para: actualizar user_metadata de roles, eliminar usuarios de Auth, etc.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Necesaria para operaciones admin."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
