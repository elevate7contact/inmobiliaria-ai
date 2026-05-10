import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SignupForm } from './SignupForm';

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === 'REALTOR' ? '/dashboard' : '/search');
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Crear cuenta</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        Elegí cómo querés usar la plataforma.
      </p>

      <SignupForm />

      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-sm text-center text-zinc-600 dark:text-zinc-400">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Iniciá sesión
        </Link>
      </div>
    </div>
  );
}
