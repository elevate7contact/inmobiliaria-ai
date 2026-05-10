/**
 * POST /api/auth/refresh-token
 *
 * Extiende la sesión actual 7 días más. El middleware ya hace refresh sliding
 * automático en cada navegación, así que este endpoint queda para casos donde
 * el cliente quiere extender explícitamente (ej. SPA que está mucho tiempo
 * idle y quiere mantener sesión antes de expirar).
 *
 * Response 200: { ok: true, expiresAt }
 * Response 401: { ok: false, error: 'Sesión expirada' }
 */
import { NextResponse } from 'next/server';
import { refreshSession } from '@/lib/session';

export async function POST() {
  const session = await refreshSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'Sesión expirada o inexistente' },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true, expiresAt: session.expiresAt });
}
