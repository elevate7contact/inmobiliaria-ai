"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      onClick={() => signOut(() => router.push("/login"))}
      className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-indigo-400 hover:text-indigo-600"
    >
      Salir
    </button>
  );
}
