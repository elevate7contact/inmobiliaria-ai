// src/app/(searcherApp)/search/page.tsx
// Página principal de búsqueda. Server component que fetchea countries y
// pasa al SearchForm. Si hay searchId en URL, renderiza SearchResults debajo.

import { prisma } from "@/lib/prisma";
import SearchForm from "@/components/search/SearchForm";
import SearchResults from "@/components/search/SearchResults";

type SearchPageProps = {
  searchParams: Promise<{ searchId?: string; propertyId?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const searchId = params.searchId;

  const countries = await prisma.country.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      cities: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Encontrá tu próximo lugar
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Escribí lo que buscás en lenguaje natural — la IA hace el resto.
        </p>
      </div>

      <SearchForm
        countries={countries.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          currency: c.currency,
          cities: c.cities,
        }))}
      />

      {searchId && <SearchResults searchId={searchId} />}
    </div>
  );
}
