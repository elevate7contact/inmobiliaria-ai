// src/components/realtor/DashboardStats.tsx
// Grid de 4 cards con métricas clave del realtor. Server-component friendly (sin "use client").

type Stats = {
  totalProperties: number;
  activeProperties: number;
  totalViews: number;
  withHighlights: number;
};

export default function DashboardStats({ stats }: { stats: Stats }) {
  const items = [
    { label: "Total propiedades", value: stats.totalProperties },
    { label: "Activas", value: stats.activeProperties },
    { label: "Vistas totales", value: stats.totalViews },
    { label: "Con highlights IA", value: stats.withHighlights },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">{it.label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {it.value.toLocaleString("es-CO")}
          </p>
        </div>
      ))}
    </div>
  );
}
