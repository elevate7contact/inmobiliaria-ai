/**
 * POST /api/auth/login
 *
 * Wrapper REST sobre el Server Action loginAction. Útil para integraciones externas
 * (curl, Postman, mobile apps) y para mantener el contrato del plan Sprint 2.
 *
 * Body: { email: string, password: string }
 * Response 200: { ok: true, user: { id, email, role } }
 * Response 401: { ok: false, error: 'Email o contraseña incorrectos' }
 * Response 400: { ok: false, errors: { email?, password? } }
 */
import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession } from '@/lib/session';
import { LoginSchema } from '@/lib/auth-schemas';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: 'Email o contraseña incorrectos' },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Email o contraseña incorrectos' },
      { status: 401 }
    );
  }

  await createSession({ userId: user.id, email: user.email, role: user.role });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role },
  });
}
