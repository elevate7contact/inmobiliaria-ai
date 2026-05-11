"use client";

import { useEffect, useState, useCallback } from "react";

type Property = {
  id: string;
  title: string;
  status: string;
  type: string;
  price: number;
  currency: string;
  createdAt: string;
  country: { name: string };
  city: { name: string };
  realtor: { companyName: string; user: { email: string } };
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "bg-green-900 text-green-300",
  INACTIVE: "bg-gray-800 text-gray-400",
  SOLD:     "bg-red-900 text-red-300",
};

const FILTERS = [
  { label: "Todas", value: "" },
  { label: "Activas", value: "ACTIVE" },
  { label: "Inactivas", value: "INACTIVE" },
  { label: "Vendidas", value: "SOLD" },
];

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/properties?${params}`);
    const data = await res.json();
    setProperties(data.properties);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const changeStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch(`/api/admin/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchProperties();
    setUpdating(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Propiedades</h1>
        <p className="text-gray-400 text-sm mt-1">{total} registros</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                statusFilter === f.value ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Propiedad</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Realtor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ubicación</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Precio</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Sin propiedades</td>
              </tr>
            ) : properties.map((p) => (
              <tr key={p.id} className="hover:bg-gray-800 transition">
                <td className="px-6 py-3">
                  <p className="text-gray-200 font-medium max-w-xs truncate">{p.title}</p>
                  <p className="text-gray-500 text-xs">{p.type}</p>
                </td>
                <td className="px-6 py-3">
                  <p className="text-gray-300 text-xs">{p.realtor.companyName}</p>
                  <p className="text-gray-500 text-xs">{p.realtor.user.email}</p>
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">
                  {p.city.name}, {p.country.name}
                </td>
                <td className="px-6 py-3 text-right text-gray-300 text-xs font-medium">
                  {p.price.toLocaleString()} {p.currency}
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <select
                    value={p.status}
                    disabled={updating === p.id}
                    onChange={(e) => changeStatus(p.id, e.target.value)}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition"
            >
              ← Anterior
            </button>
            <span className="text-gray-400 text-sm">Página {page} de {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
