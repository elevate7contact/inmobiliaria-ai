// src/components/search/SearchResults.tsx
// Fetcha resultados del searchId, los pinta como grid de PropertyCard y abre
// PropertyDetail en modal cuando se selecciona una. Incluye botón "Guardar búsqueda".

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PropertyCard, { type PropertyForCard } from "./PropertyCard";
import PropertyDetail from "./PropertyDetail";

type ResultProperty = PropertyForCard & {
  description: string;
  yearBuilt: number | null;
  floor: number | null;
  services: string[];
  directLink: string | null;
  realtor: {
    id: string;
    companyName: string;
    companyEmail: string | null;
    companyPhone: string | null;
    websiteUrl: string | null;
    logoUrl: string | null;
  };
};

export default function SearchResults({ searchId }: { searchId: string }) {
  const sp = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<ResultProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResultProperty | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("searchId", searchId);
    // forward filtros opcionales
    ["priceMin", "priceMax", "type", "bedrooms", "bathrooms", "services"].forEach(
      (k) => {
        const v = sp.get(k);
        if (v) params.set(k, v);
      }
    );

    setLoading(true);
    fetch(`/api/search/results?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProperties(data.properties ?? []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [searchId, sp]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/search/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId, name: saveName.trim() }),
      });
      if (res.ok) {
        setSaveOpen(false);
        setSaveName("");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Buscando coincidencias...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {properties.length} resultado{properties.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setSaveOpen((v) => !v)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
        >
          Guardar búsqueda
        </button>
      </div>

      {saveOpen && (
        <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-3">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Nombre, ej. 'Aptos Bogotá ≤ 500M'"
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No encontramos propiedades con esos criterios. Probá relajar el presupuesto
          o cambiar la ciudad.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onSelect={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      {selected && (
        <PropertyDetail
          property={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
