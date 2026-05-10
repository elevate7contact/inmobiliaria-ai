/**
 * /login — Server component que renderiza el form. La lógica vive en el form
 * cliente que llama al Server Action loginAction.
 *
 * Si el user ya está logueado, redirige según rol (no tiene sentido mostrar login).
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === 'REALTOR' ? '/dashboard' : '/search');
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Iniciar sesión</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        Bienvenido de nuevo a Inmobiliaria AI.
      </p>

      <LoginForm />

      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-sm text-center text-zinc-600 dark:text-zinc-400">
        ¿Aún no tenés cuenta?{' '}
        <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
          Registrate gratis
        </Link>
      </div>
    </div>
  );
}
