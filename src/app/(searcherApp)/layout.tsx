import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import SignOutButton from "@/components/search/SignOutButton";
import ChatWidgetLazy from "@/components/chat/ChatWidgetLazy";

export default async function SearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const email = user.primaryEmailAddress?.emailAddress ?? "";

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
            <span className="hidden text-xs text-gray-500 sm:inline">{email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-6">{children}</main>
      <ChatWidgetLazy />
    </div>
  );
}
