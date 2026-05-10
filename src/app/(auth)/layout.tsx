/**
 * Layout del route group (auth) — sin navbar, centrado, fondo limpio.
 * Aplica a /login, /signup, /reset-password.
 */
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
