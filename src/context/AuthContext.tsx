"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthContextType, AppUser, UserRole } from "@/types";

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadUser = useCallback(
    async (supabaseUser: AppUser | null) => {
      if (!supabaseUser) {
        setUser(null);
        setRole(null);
        return;
      }

      // Obtener rol desde los metadatos del usuario
      const userRole =
        (supabaseUser.user_metadata?.role as UserRole) ?? "SEARCHER";
      setUser({ ...supabaseUser, role: userRole });
      setRole(userRole);
    },
    []
  );

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser((session?.user as AppUser) ?? null).finally(() =>
        setLoading(false)
      );
    });

    // Escuchar cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser((session?.user as AppUser) ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadUser, supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
