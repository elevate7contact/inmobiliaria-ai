/**
 * Home — landing pública. Si el user ya está logueado redirige a su área.
 * Versión MVP del Sprint 2 (placeholder); el compañero la pulirá en sprints siguientes.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === 'REALTOR' ? '/dashboard' : '/search');
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight mb-6">
          Inmobiliaria <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
          Plataforma global de propiedades en arriendo. Búsqueda inteligente para inquilinos,
          gestión simple para inmobiliarias.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-lg transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
