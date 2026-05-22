export type UserRole = "SEARCHER" | "REALTOR" | "ADMIN";

export interface AppUser {
  id: string;
  email: string;
  role?: UserRole;
  user_metadata?: {
    role?: UserRole;
    name?: string;
    [key: string]: unknown;
  };
}

export interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
