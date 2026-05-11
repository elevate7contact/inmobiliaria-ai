import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalUsers, totalRealtors, totalSearchers,
    totalProperties, activeProperties,
    totalSubscriptions, pendingRealtors, recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "REALTOR" } }),
    prisma.user.count({ where: { role: "SEARCHER" } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.realtorProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);
  return { totalUsers, totalRealtors, totalSearchers, totalProperties, activeProperties, totalSubscriptions, pendingRealtors, recentUsers };
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-red-900 text-red-300",
  REALTOR: "bg-indigo-900 text-indigo-300",
  SEARCHER: "bg-gray-800 text-gray-300",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") redirect("/login");

  const stats = await getStats();

  const cards = [
    { label: "Usuarios totales", value: stats.totalUsers, icon: "👥", color: "border-indigo-500" },
    { label: "Realtors", value: stats.totalRealtors, icon: "🏢", color: "border-blue-500" },
    { label: "Buscadores", value: stats.totalSearchers, icon: "🔍", color: "border-green-500" },
    { label: "Propiedades activas", value: stats.activeProperties, icon: "🏠", sub: `de ${stats.totalProperties} totales`, color: "border-yellow-500" },
    { label: "Suscripciones activas", value: stats.totalSubscriptions, icon: "💳", color: "border-purple-500" },
    { label: "Realtors pendientes", value: stats.pendingRealtors, icon: "⏳", color: "border-orange-500" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Resumen general de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className={`bg-gray-900 rounded-xl p-5 border-l-4 ${c.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">{c.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{c.value.toLocaleString()}</p>
                {c.sub && <p className="text-xs text-gray-500 mt-1">{c.sub}</p>}
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Usuarios recientes */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Usuarios recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {stats.recentUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800 transition">
                <td className="px-6 py-3 text-gray-200">{u.email}</td>
                <td className="px-6 py-3 text-gray-400">{u.name ?? "—"}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
