"use client";

import { useEffect, useState } from "react";
import AnalyticsChart from "@/components/realtor/AnalyticsChart";

type Range = "7" | "30" | "all";

interface Stats {
  totalProperties: number;
  activeProperties: number;
  totalLeads: number;
  totalViews: number;
}

interface LeadData {
  propertyId: string;
  title: string;
  leads: number;
  viewCount: number;
}

interface AnalyticsData {
  stats: Stats;
  leadsPerProperty: LeadData[];
  range: string;
}

const RANGES: { label: string; value: Range }[] = [
  { label: "Últimos 7 días", value: "7" },
  { label: "Últimos 30 días", value: "30" },
  { label: "Todo el tiempo", value: "all" },
];

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: number;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">
            {value.toLocaleString()}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<Range>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`/api/analytics?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar datos");
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setError("No se pudieron cargar los datos de analytics"))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rendimiento de tus propiedades
          </p>
        </div>

        {/* Selector de rango */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                range === r.value
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Propiedades activas"
            value={data.stats.activeProperties}
            icon="🏠"
            sub={`de ${data.stats.totalProperties} totales`}
          />
          <StatCard
            label="Leads en período"
            value={data.stats.totalLeads}
            icon="👆"
            sub="Clicks desde búsquedas"
          />
          <StatCard
            label="Vistas totales"
            value={data.stats.totalViews}
            icon="👁️"
            sub="Acumulado histórico"
          />
          <StatCard
            label="Conversión"
            value={
              data.stats.totalViews > 0
                ? Math.round(
                    (data.stats.totalLeads / data.stats.totalViews) * 100
                  )
                : 0
            }
            icon="📈"
            sub="% leads / vistas"
          />
        </div>
      ) : null}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-6">
          Leads por propiedad
          {!loading && data && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              — Top {data.leadsPerProperty.length} propiedades
            </span>
          )}
        </h2>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex gap-2 items-end">
              {[40, 70, 50, 90, 60].map((h, i) => (
                <div
                  key={i}
                  className="w-8 bg-indigo-100 rounded-t animate-pulse"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        ) : data ? (
          <AnalyticsChart data={data.leadsPerProperty} />
        ) : null}
      </div>

      {/* Tabla de detalle */}
      {!loading && data && data.leadsPerProperty.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-700">
              Detalle por propiedad
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Propiedad
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Leads
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Vistas
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Conv. %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.leadsPerProperty.map((row) => (
                <tr key={row.propertyId} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-gray-800 font-medium max-w-xs truncate">
                    {row.title}
                  </td>
                  <td className="px-6 py-3 text-right text-indigo-600 font-semibold">
                    {row.leads}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {row.viewCount}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">
                    {row.viewCount > 0
                      ? `${Math.round((row.leads / row.viewCount) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
