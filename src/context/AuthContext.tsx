"use client";

import { createContext, useContext } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import type { AuthContextType, AppUser, UserRole } from "@/types";

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const role = (clerkUser?.publicMetadata?.role as UserRole) ?? null;

  const appUser: AppUser | null = clerkUser
    ? ({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        role,
        user_metadata: {
          role,
          name: clerkUser.fullName ?? "",
        },
      } as AppUser)
    : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider
      value={{ user: appUser, role, loading: !isLoaded, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
