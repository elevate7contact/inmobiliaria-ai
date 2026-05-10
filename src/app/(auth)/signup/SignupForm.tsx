'use client';

import { useActionState, useState } from 'react';
import { signupAction } from '@/app/actions/auth';
import type { AuthFormState } from '@/lib/auth-schemas';

type Role = 'SEARCHER' | 'REALTOR';

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signupAction, undefined);
  const [role, setRole] = useState<Role>('SEARCHER');
  const errors = state && !state.ok ? state.errors : undefined;

  return (
    <form action={action} className="space-y-4">
      {/* Selector de rol — afecta qué campos se muestran */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Tipo de cuenta</label>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption value="SEARCHER" current={role} onChange={setRole} title="Busco propiedad" subtitle="Quiero arrendar" />
          <RoleOption value="REALTOR" current={role} onChange={setRole} title="Soy inmobiliaria" subtitle="Publico propiedades" />
        </div>
        <input type="hidden" name="role" value={role} />
        {errors?.role && <p className="mt-1 text-xs text-red-600">{errors.role[0]}</p>}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          {role === 'REALTOR' ? 'Tu nombre (responsable)' : 'Tu nombre'}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors?.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
      </div>

      {role === 'REALTOR' && (
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium mb-1.5">Nombre de la inmobiliaria</label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName[0]}</p>}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors?.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-zinc-500">Mínimo 8 caracteres, una letra y un número.</p>
        {errors?.password && (
          <ul className="mt-1 text-xs text-red-600 space-y-0.5">
            {errors.password.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        )}
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
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}

function RoleOption({
  value,
  current,
  onChange,
  title,
  subtitle,
}: {
  value: Role;
  current: Role;
  onChange: (v: Role) => void;
  title: string;
  subtitle: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`text-left rounded-lg border-2 px-3 py-2.5 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
    </button>
  );
}
