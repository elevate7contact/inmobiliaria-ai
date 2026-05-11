"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/realtors", label: "Realtors", icon: "🏢" },
  { href: "/admin/users", label: "Usuarios", icon: "👥" },
  { href: "/admin/properties", label: "Propiedades", icon: "🏠" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg">Chatinmuebles</span>
        <span className="block text-xs text-indigo-400 mt-0.5">Panel Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
