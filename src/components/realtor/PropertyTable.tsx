// src/components/realtor/PropertyTable.tsx
// Tabla de propiedades del realtor con acciones rápidas (editar, toggle status, eliminar).
// Responsive: en mobile colapsa a cards. Refresca al ejecutar acción vía router.refresh().

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PropertyRow = {
  id: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  status: "ACTIVE" | "INACTIVE" | "SOLD";
  viewCount: number;
  photoUrls: string[];
  highlightId?: string | null;
  highlightUntil?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-200 text-gray-700",
  SOLD: "bg-red-100 text-red-800",
};

export default function PropertyTable({
  properties,
}: {
  properties: PropertyRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightBusy, setHighlightBusy] = useState<string | null>(null);

  const toggleStatus = async (p: PropertyRow) => {
    const nextStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error actualizando estado");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyId(null);
    }
  };

  const toggleHighlight = async (p: PropertyRow) => {
    setHighlightBusy(p.id);
    setError(null);
    try {
      if (p.highlightId) {
        // Desactivar highlight
        const res = await fetch(`/api/highlights/${p.highlightId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error eliminando highlight");
        }
      } else {
        // Crear highlight
        const res = await fetch("/api/highlights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propertyId: p.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error activando highlight");
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setHighlightBusy(null);
    }
  };

  const remove = async (p: PropertyRow) => {
    if (!confirm(`¿Eliminar "${p.title}"? Se desactiva (soft delete).`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error eliminando");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyId(null);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-gray-600">No hay propiedades para mostrar.</p>
        <Link
          href="/properties/new"
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Crear primera propiedad
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Foto</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Título</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">H/B</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Vistas</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Destacada</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {properties.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  {p.photoUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrls[0]} alt="" className="h-12 w-16 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-16 rounded bg-gray-100" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.title}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.type}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {p.price.toLocaleString("es-CO")} {p.currency}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {p.bedrooms}/{p.bathrooms}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.viewCount}</td>
                <td className="px-4 py-3">
                  {p.highlightId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      ⭐ Activa
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/properties/${p.id}/edit`}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {p.status === "ACTIVE" && (
                      <button
                        type="button"
                        disabled={highlightBusy === p.id}
                        onClick={() => toggleHighlight(p)}
                        className={`rounded border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          p.highlightId
                            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                            : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        }`}
                      >
                        {highlightBusy === p.id
                          ? "..."
                          : p.highlightId
                          ? "Quitar destaque"
                          : "⭐ Destacar"}
                      </button>
                    )}
                    {p.status !== "SOLD" && (
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => toggleStatus(p)}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {p.status === "ACTIVE" ? "Desactivar" : "Activar"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === p.id || p.status === "INACTIVE"}
                      onClick={() => remove(p)}
                      className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {properties.map((p) => (
          <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              {p.photoUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrls[0]} alt="" className="h-20 w-24 flex-shrink-0 rounded object-cover" />
              ) : (
                <div className="h-20 w-24 flex-shrink-0 rounded bg-gray-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500">
                  {p.type} · {p.bedrooms}H / {p.bathrooms}B
                </p>
                <p className="text-sm text-gray-700">
                  {p.price.toLocaleString("es-CO")} {p.currency}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[p.status] ?? "bg-gray-100"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs text-gray-500">{p.viewCount} vistas</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/properties/${p.id}/edit`}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                Editar
              </Link>
              {p.status === "ACTIVE" && (
                <button
                  type="button"
                  disabled={highlightBusy === p.id}
                  onClick={() => toggleHighlight(p)}
                  className={`rounded border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                    p.highlightId
                      ? "border-amber-300 text-amber-700"
                      : "border-indigo-300 text-indigo-700"
                  }`}
                >
                  {highlightBusy === p.id ? "..." : p.highlightId ? "Quitar destaque" : "⭐ Destacar"}
                </button>
              )}
              {p.status !== "SOLD" && (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => toggleStatus(p)}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                >
                  {p.status === "ACTIVE" ? "Desactivar" : "Activar"}
                </button>
              )}
              <button
                type="button"
                disabled={busyId === p.id || p.status === "INACTIVE"}
                onClick={() => remove(p)}
                className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
