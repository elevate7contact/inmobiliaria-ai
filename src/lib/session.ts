/**
 * Session management con JWT firmado.
 *
 * Patrón canónico Next.js 16 + React 19:
 * - JWT firmado con jose (compatible con Edge runtime → middleware corre en Edge)
 * - Cookies httpOnly + sameSite=lax para resistir CSRF y XSS
 * - 7 días de vida con refresh sliding (cada navegación extiende)
 * - Rol incluido en el payload para que el middleware decida sin hit a DB
 */
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole } from '@prisma/client';

const SESSION_COOKIE = 'inmob_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: number; // unix ms
  [key: string]: unknown; // jose JWTPayload requirement
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET falta o es muy corta (<32 chars). Generala con: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Crea una sesión nueva — login + signup la llaman.
 * Setea la cookie httpOnly con el JWT firmado.
 */
export async function createSession(data: {
  userId: string;
  email: string;
  role: UserRole;
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload: SessionPayload = {
    userId: data.userId,
    email: data.email,
    role: data.role,
    expiresAt,
  };
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

/**
 * Lee la sesión actual desde cookie. Devuelve null si no hay o expiró.
 * Llamable desde Server Components, Server Actions, route handlers.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

/**
 * Borra la sesión (logout). Sobreescribe la cookie con valor vacío + maxAge=0.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Refresh sliding — extiende la cookie 7 días más.
 * Útil para que el usuario activo no tenga que re-loguearse cada semana.
 */
export async function refreshSession(): Promise<SessionPayload | null> {
  const current = await getSession();
  if (!current) return null;
  await createSession({ userId: current.userId, email: current.email, role: current.role });
  return current;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
