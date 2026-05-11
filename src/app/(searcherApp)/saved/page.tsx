// src/app/(searcherApp)/saved/page.tsx
// Lista las SavedSearch del user logueado. Botón "Reproducir" → /search?searchId=...

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const saved = await prisma.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { search: true },
  });

  // Cargar países en paralelo (Search no tiene relación explícita en el schema)
  const countryIds = Array.from(new Set(saved.map((s) => s.search.countryId)));
  const countries = await prisma.country.findMany({
    where: { id: { in: countryIds } },
    select: { id: true, name: true, code: true },
  });
  const countryMap = new Map(countries.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Búsquedas guardadas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Volvé a correr cualquiera de tus búsquedas anteriores.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">
            Aún no guardaste ninguna búsqueda.
          </p>
          <Link
            href="/search"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Ir a buscar →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {countryMap.get(s.search.countryId)?.name ?? "—"} ·{" "}
                  {s.search.budgetMax
                    ? `hasta ${s.search.budgetMax.toLocaleString()}`
                    : "sin presupuesto"}{" "}
                  · {s.search.bedrooms ?? "—"} hab
                </p>
              </div>
              <Link
                href={`/search?searchId=${s.searchId}`}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Reproducir
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
