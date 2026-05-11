"use client";

import { useEffect, useState, useCallback } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  realtorProfile: { verificationStatus: string; companyName: string } | null;
  subscription: { plan: string; status: string } | null;
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    "bg-red-900 text-red-300",
  REALTOR:  "bg-indigo-900 text-indigo-300",
  SEARCHER: "bg-gray-800 text-gray-300",
};

const FILTERS = [
  { label: "Todos", value: "" },
  { label: "Realtors", value: "REALTOR" },
  { label: "Buscadores", value: "SEARCHER" },
  { label: "Admins", value: "ADMIN" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (roleFilter) params.set("role", roleFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (id: string, role: string) => {
    setUpdating(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await fetchUsers();
    setUpdating(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <p className="text-gray-400 text-sm mt-1">{total} registros</p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setRoleFilter(f.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                roleFilter === f.value ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Plan</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cambiar rol</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Sin usuarios</td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800 transition">
                <td className="px-6 py-3 text-gray-200">{u.email}</td>
                <td className="px-6 py-3 text-gray-400">{u.name ?? "—"}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">
                  {u.subscription ? `${u.subscription.plan} · ${u.subscription.status}` : "—"}
                </td>
                <td className="px-6 py-3 text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("es-CO")}
                </td>
                <td className="px-6 py-3 text-right">
                  <select
                    value={u.role}
                    disabled={updating === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="SEARCHER">SEARCHER</option>
                    <option value="REALTOR">REALTOR</option>
                    <option value="ADMIN">ADMIN</option>
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
