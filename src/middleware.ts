/**
 * Middleware — corre en Edge runtime, antes de cada request.
 *
 * Responsabilidades:
 * 1. Leer la cookie de sesión y verificar el JWT.
 * 2. Bloquear acceso a rutas protegidas si no hay sesión válida.
 * 3. Refresh sliding del token (extiende cookie 7 días en cada navegación).
 * 4. Redirigir según rol cuando aplica (un SEARCHER no debe ver /dashboard).
 *
 * Las páginas públicas (login, signup, /, /api/auth/*) pasan sin chequeo.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const SESSION_COOKIE = 'inmob_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Rutas públicas — no requieren sesión
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/reset-password'];
const PUBLIC_API_PREFIXES = ['/api/auth/'];

// Rutas que solo REALTOR puede acceder
const REALTOR_ONLY_PREFIXES = ['/dashboard', '/properties', '/subscription', '/analytics', '/api-docs'];

// Rutas que solo SEARCHER puede acceder
const SEARCHER_ONLY_PREFIXES = ['/search', '/saved'];

interface JWTPayload {
  userId: string;
  email: string;
  role: 'SEARCHER' | 'REALTOR' | 'ADMIN';
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET missing');
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

async function refreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pasar libre rutas públicas
  if (isPublicRoute(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  // No hay sesión válida → redirigir a login
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Chequeo de rol — REALTOR no entra a /search, SEARCHER no entra a /dashboard
  if (matchesPrefix(pathname, REALTOR_ONLY_PREFIXES) && session.role !== 'REALTOR') {
    return NextResponse.redirect(new URL('/search', req.url));
  }
  if (matchesPrefix(pathname, SEARCHER_ONLY_PREFIXES) && session.role !== 'SEARCHER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Refresh sliding — re-emitir cookie con expiración renovada
  const fresh = await refreshToken(session);
  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(Date.now() + SESSION_DURATION_MS),
    path: '/',
  });
  return res;
}

export const config = {
  // Aplica a todo excepto static assets, imágenes y favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
