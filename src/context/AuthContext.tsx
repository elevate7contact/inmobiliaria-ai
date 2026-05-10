/**
 * AuthContext — capa fina sobre la sesión server-side.
 *
 * El estado de auth real vive en la cookie httpOnly + JWT (server). Este
 * contexto solo expone una vista read-only del usuario actual a los componentes
 * cliente, para que el equipo (en Sprints 3-7) pueda usar useAuth() sin pensar
 * en cómo se valida.
 *
 * Cómo se hidrata: el RootLayout (server component) lee la sesión vía
 * getSession() y pasa el user inicial al provider. Cualquier mutación (login,
 * logout, signup) ocurre vía Server Action y dispara router.refresh() para
 * que el provider reciba el nuevo state.
 */
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRealtor: boolean;
  isSearcher: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ProviderProps {
  user: AuthUser | null;
  children: ReactNode;
}

export function AuthProvider({ user, children }: ProviderProps) {
  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isRealtor: user?.role === 'REALTOR',
    isSearcher: user?.role === 'SEARCHER',
    isAdmin: user?.role === 'ADMIN',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook que usa el resto del equipo para leer el user actual.
 *
 * Ejemplo:
 *   const { user, isRealtor } = useAuth();
 *   if (!user) return null;
 *   if (isRealtor) return <DashboardLink />;
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() debe llamarse dentro de <AuthProvider>. Verificá que el RootLayout esté envolviendo la app.');
  }
  return ctx;
}
