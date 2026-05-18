// src/app/(searcherApp)/layout.tsx
// Layout para buscadores. Server component. Verifica sesión y renderiza navbar.
// Si no hay user → redirect a /login (defensa en profundidad; proxy.ts también protege).

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/search/SignOutButton";

export default async function SearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/search" className="text-lg font-semibold text-gray-900">
            inmobiliaria<span className="text-indigo-600">.ai</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/search" className="text-gray-700 hover:text-indigo-600">
              Buscar
            </Link>
            <Link href="/saved" className="text-gray-700 hover:text-indigo-600">
              Guardadas
            </Link>
            <Link href="/preferences" className="text-gray-700 hover:text-indigo-600">
              Preferencias
            </Link>
            <span className="hidden text-xs text-gray-500 sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
