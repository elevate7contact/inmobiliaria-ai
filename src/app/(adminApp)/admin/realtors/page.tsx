"use client";

import { useEffect, useState, useCallback } from "react";

type Realtor = {
  id: string;
  companyName: string;
  verificationStatus: string;
  createdAt: string;
  user: { email: string; name: string | null };
  _count: { properties: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-900 text-yellow-300",
  VERIFIED: "bg-green-900 text-green-300",
  REJECTED: "bg-red-900 text-red-300",
};

const FILTERS = [
  { label: "Todos", value: "" },
  { label: "Pendientes", value: "PENDING" },
  { label: "Verificados", value: "VERIFIED" },
  { label: "Rechazados", value: "REJECTED" },
];

export default function AdminRealtorsPage() {
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRealtors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/realtors?${params}`);
    const data = await res.json();
    setRealtors(data.realtors);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, status]);

  useEffect(() => { fetchRealtors(); }, [fetchRealtors]);

  const updateStatus = async (id: string, verificationStatus: string) => {
    setUpdating(id);
    await fetch(`/api/admin/realtors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationStatus }),
    });
    await fetchRealtors();
    setUpdating(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Realtors</h1>
        <p className="text-gray-400 text-sm mt-1">{total} registros</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              status === f.value ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Empresa</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Props.</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Acciones</th>
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
            ) : realtors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Sin realtors</td>
              </tr>
            ) : realtors.map((r) => (
              <tr key={r.id} className="hover:bg-gray-800 transition">
                <td className="px-6 py-3 text-gray-200 font-medium">{r.companyName}</td>
                <td className="px-6 py-3 text-gray-400">{r.user.email}</td>
                <td className="px-6 py-3 text-center text-gray-400">{r._count.properties}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.verificationStatus]}`}>
                    {r.verificationStatus}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("es-CO")}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {r.verificationStatus !== "VERIFIED" && (
                      <button
                        onClick={() => updateStatus(r.id, "VERIFIED")}
                        disabled={updating === r.id}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition disabled:opacity-50"
                      >
                        Verificar
                      </button>
                    )}
                    {r.verificationStatus !== "REJECTED" && (
                      <button
                        onClick={() => updateStatus(r.id, "REJECTED")}
                        disabled={updating === r.id}
                        className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    )}
                    {r.verificationStatus !== "PENDING" && (
                      <button
                        onClick={() => updateStatus(r.id, "PENDING")}
                        disabled={updating === r.id}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition disabled:opacity-50"
                      >
                        Pendiente
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
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
