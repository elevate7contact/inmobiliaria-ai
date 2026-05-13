// src/app/(realtorApp)/properties/page.tsx
// Lista paginada de propiedades del realtor logueado. Filtros: status, search por title.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PropertyTable, {
  type PropertyRow,
} from "@/components/realtor/PropertyTable";
import CsvActions from "@/components/realtor/CsvActions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = {
  status?: string;
  q?: string;
  page?: string;
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status, q, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  let total = 0;
  let properties: PropertyRow[] = [];

  if (realtor) {
    const where = {
      realtorId: realtor.id,
      ...(status && ["ACTIVE", "INACTIVE", "SOLD"].includes(status)
        ? { status: status as "ACTIVE" | "INACTIVE" | "SOLD" }
        : {}),
      ...(q
        ? { title: { contains: q, mode: "insensitive" as const } }
        : {}),
    };

    const now = new Date();
    const [count, rows] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          type: true,
          price: true,
          currency: true,
          bedrooms: true,
          bathrooms: true,
          status: true,
          viewCount: true,
          photoUrls: true,
          highlights: {
            where: { status: "ACTIVE", activeUntil: { gt: now } },
            select: { id: true, activeUntil: true },
          },
        },
      }),
    ]);

    total = count;
    properties = rows.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      price: p.price,
      currency: p.currency,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      status: p.status,
      viewCount: p.viewCount,
      photoUrls: p.photoUrls,
      highlightId: p.highlights[0]?.id ?? null,
      highlightUntil: p.highlights[0]?.activeUntil?.toISOString() ?? null,
    }));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (params: Partial<SearchParams>) => {
    const sp = new URLSearchParams();
    const merged = { status, q, page: String(page), ...params };
    if (merged.status) sp.set("status", merged.status);
    if (merged.q) sp.set("q", merged.q);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    const qs = sp.toString();
    return `/properties${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propiedades</h1>
          <p className="text-sm text-gray-600">
            {total} {total === 1 ? "propiedad" : "propiedades"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvActions />
          <Link
            href="/properties/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva propiedad
          </Link>
        </div>
      </header>

      <form
        action="/properties"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-gray-600">
            Buscar por título
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Apartamento Chapinero..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Estado</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activas</option>
            <option value="INACTIVE">Inactivas</option>
            <option value="SOLD">Vendidas</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Filtrar
        </button>
      </form>

      <PropertyTable properties={properties} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: String(page - 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
