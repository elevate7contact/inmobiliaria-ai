// src/components/search/SignOutButton.tsx
// Botón cliente para cerrar sesión.

"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-indigo-400 hover:text-indigo-600"
    >
      Salir
    </button>
  );
}
