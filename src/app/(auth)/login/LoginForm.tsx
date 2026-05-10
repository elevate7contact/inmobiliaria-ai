/**
 * Form cliente — usa useActionState (React 19) para manejar estado del form
 * mientras el Server Action loginAction se ejecuta.
 */
'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import type { AuthFormState } from '@/lib/auth-schemas';

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, undefined);
  const errors = state && !state.ok ? state.errors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="vos@ejemplo.com"
        />
        {errors?.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors?.password && <p className="mt-1 text-xs text-red-600">{errors.password[0]}</p>}
      </div>

      {errors?._form && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <p className="text-sm text-red-700 dark:text-red-400">{errors._form[0]}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
