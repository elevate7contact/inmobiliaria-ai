// src/components/realtor/RealtorSidebar.tsx
// Sidebar navigation para el dashboard del realtor. Responsive: drawer en mobile.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Propiedades" },
  { href: "/subscription", label: "Suscripción" },
  { href: "/analytics", label: "Analytics" },
  { href: "/api-docs", label: "API Docs" },
];

export default function RealtorSidebar({
  email,
  companyName,
}: {
  email: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile topbar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
          aria-label="Abrir menú"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">{companyName}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          Salir
        </button>
      </div>
      {/* spacer for fixed mobile topbar */}
      <div className="h-14 md:hidden" />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-6 py-5">
            <Link href="/dashboard" className="block">
              <p className="truncate text-sm font-semibold text-gray-900">
                {companyName}
              </p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive(l.href)
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
