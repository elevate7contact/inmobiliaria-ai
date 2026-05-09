import type { User } from "@supabase/supabase-js";

export type UserRole = "SEARCHER" | "REALTOR" | "ADMIN";

export interface AppUser extends User {
  role?: UserRole;
  name?: string;
}

export interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// API response helpers
export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
