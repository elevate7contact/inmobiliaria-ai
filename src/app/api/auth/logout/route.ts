/**
 * POST /api/auth/logout
 * Borra la cookie de sesión. No requiere body.
 */
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ ok: true });
}
