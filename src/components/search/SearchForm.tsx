// src/components/search/SearchForm.tsx
// Formulario híbrido: input natural language + acordeón de filtros avanzados.
// Submit con IA → POST /api/search/ask → redirect /search?searchId=...

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Country = {
  id: string;
  code: string;
  name: string;
  currency: string;
  cities: { id: string; name: string }[];
};

const SERVICES = [
  { key: "pool", label: "Piscina" },
  { key: "gym", label: "Gimnasio" },
  { key: "parking", label: "Parqueadero" },
  { key: "security", label: "Seguridad 24/7" },
  { key: "balcony", label: "Balcón" },
  { key: "pet-friendly", label: "Pet-friendly" },
];

const TYPES = [
  { key: "", label: "Cualquier tipo" },
  { key: "APARTMENT", label: "Apartamento" },
  { key: "HOUSE", label: "Casa" },
  { key: "LAND", label: "Lote / Terreno" },
  { key: "OFFICE", label: "Oficina" },
  { key: "COMMERCIAL", label: "Local comercial" },
];

export default function SearchForm({ countries }: { countries: Country[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtros avanzados
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  function toggleService(key: string) {
    setSelectedServices((curr) =>
      curr.includes(key) ? curr.filter((s) => s !== key) : [...curr, key]
    );
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setErrorMsg("Escribí qué estás buscando");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setClarifications([]);

    try {
      const res = await fetch("/api/search/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, countryCode }),
      });
      const data = await res.json();

      if (data.needsClarification) {
        setClarifications(data.suggestions ?? []);
        return;
      }
      if (!res.ok || !data.searchId) {
        setErrorMsg(data.error ?? "No se pudo procesar la búsqueda");
        return;
      }

      // Aplicar overrides del acordeón si están activos
      const overrides = buildOverrideQuery();
      const url = overrides
        ? `/search?searchId=${data.searchId}&${overrides}`
        : `/search?searchId=${data.searchId}`;
      router.push(url);
      router.refresh();
    } catch {
      setErrorMsg("Error de red");
    } finally {
      setLoading(false);
    }
  }

  function buildOverrideQuery(): string {
    const params = new URLSearchParams();
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (type) params.set("type", type);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (bathrooms) params.set("bathrooms", bathrooms);
    if (selectedServices.length > 0)
      params.set("services", selectedServices.join(","));
    return params.toString();
  }

  return (
    <form onSubmit={handleAISearch} className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: apartamento 2 cuartos en Bogotá menos de 500K con piscina"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {countries.map((c) => (
              <option key={c.id} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Buscando..." : "Buscar con IA"}
          </button>
        </div>

        {errorMsg && (
          <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
        )}

        {clarifications.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Necesito más info. Probá responder:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
              {clarifications.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-3 text-xs font-medium text-indigo-600 hover:underline"
        >
          {showAdvanced ? "Ocultar" : "Mostrar"} búsqueda avanzada
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="text-xs font-medium text-gray-700">
              Precio mínimo
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Precio máximo
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Tipo
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Habitaciones (mín)
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Cualquier</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Baños (mín)
              <select
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Cualquier</option>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <div className="col-span-full">
              <p className="text-xs font-medium text-gray-700">Servicios</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SERVICES.map((s) => (
                  <label
                    key={s.key}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                      selectedServices.includes(s.key)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedServices.includes(s.key)}
                      onChange={() => toggleService(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
