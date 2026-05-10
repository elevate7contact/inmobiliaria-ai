/**
 * Navbar base — reacciona al rol del user.
 *
 * SEARCHER ve: Buscar / Saved
 * REALTOR  ve: Dashboard / Propiedades / Suscripción / Analytics / API Docs
 * ADMIN    ve: todo (cuando exista panel admin)
 * Anónimo  ve: Login / Registro
 *
 * Espacio reservado para que el compañero le agregue branding final cuando llegue
 * el momento. Por ahora minimalista, mobile-first.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logoutAction } from '@/app/actions/auth';

export function Navbar() {
  const { user, isRealtor, isSearcher } = useAuth();
  const pathname = usePathname();

  // No mostrar navbar en páginas de auth — limpieza visual
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/reset-password')) {
    return null;
  }

  const linkClass = (href: string) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      pathname.startsWith(href)
        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
        : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
    }`;

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Inmobiliaria <span className="text-blue-600">AI</span>
        </Link>

        <div className="flex items-center gap-1">
          {isSearcher && (
            <>
              <Link href="/search" className={linkClass('/search')}>Buscar</Link>
              <Link href="/saved" className={linkClass('/saved')}>Guardadas</Link>
            </>
          )}

          {isRealtor && (
            <>
              <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
              <Link href="/properties" className={linkClass('/properties')}>Propiedades</Link>
              <Link href="/subscription" className={linkClass('/subscription')}>Suscripción</Link>
              <Link href="/analytics" className={linkClass('/analytics')}>Analytics</Link>
            </>
          )}

          {user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="ml-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
              >
                Salir
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className={linkClass('/login')}>Iniciar sesión</Link>
              <Link
                href="/signup"
                className="ml-2 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
