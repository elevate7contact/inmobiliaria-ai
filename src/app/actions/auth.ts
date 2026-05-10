/**
 * Server Actions para auth — SOURCE OF TRUTH del flujo.
 *
 * Las API routes (/api/auth/*) son envoltorios delgados sobre estas funciones
 * para mantener compatibilidad con el contrato del Sprint 2 documentado por el
 * equipo. La lógica vive acá.
 *
 * Pattern Next.js 16:
 * - 'use server' habilita Server Actions invocables desde formularios cliente
 * - Validación con Zod antes de tocar DB
 * - bcrypt para hash passwords
 * - JWT firmado vía src/lib/session.ts
 * - redirect() de next/navigation al cierre exitoso
 */
'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { createSession, deleteSession } from '@/lib/session';
import {
  LoginSchema,
  SignupSchema,
  type AuthFormState,
} from '@/lib/auth-schemas';

const BCRYPT_ROUNDS = 12;

// =============================================================================
// SIGNUP
// =============================================================================

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role: formData.get('role'),
    companyName: formData.get('companyName') || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, name, role, companyName } = parsed.data;

  // Si es REALTOR, companyName es obligatorio
  if (role === 'REALTOR' && (!companyName || companyName.length < 2)) {
    return {
      ok: false,
      errors: { companyName: ['Nombre de la inmobiliaria requerido'] },
    };
  }

  // Email único
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      errors: { _form: ['Este email ya está registrado'] },
    };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Crear User + (si aplica) RealtorProfile en transacción
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      // emailVerified: true porque Sprint 2 va sin email confirmation (decisión de equipo)
      emailVerified: true,
      ...(role === 'REALTOR' && companyName
        ? {
            realtorProfile: {
              create: {
                companyName,
              },
            },
          }
        : {}),
    },
  });

  await createSession({ userId: user.id, email: user.email, role: user.role });

  // Redirect según rol
  const redirectTo = role === 'REALTOR' ? '/dashboard' : '/search';
  redirect(redirectTo);
}

// =============================================================================
// LOGIN
// =============================================================================

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Mensaje genérico — no revelamos si el email existe o no (anti-enumeration)
  const generic = {
    ok: false as const,
    errors: { _form: ['Email o contraseña incorrectos'] },
  };

  if (!user || !user.passwordHash) return generic;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return generic;

  await createSession({ userId: user.id, email: user.email, role: user.role });

  const redirectTo = user.role === 'REALTOR' ? '/dashboard' : '/search';
  redirect(redirectTo);
}

// =============================================================================
// LOGOUT
// =============================================================================

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
