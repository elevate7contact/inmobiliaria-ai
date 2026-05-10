"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface LeadData {
  propertyId: string;
  title: string;
  leads: number;
  viewCount: number;
}

interface Props {
  data: LeadData[];
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#7c3aed", "#9333ea", "#a855f7",
  "#7e22ce", "#6d28d9",
];

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export default function AnalyticsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">📊</span>
        <p className="text-sm">Sin datos en este período</p>
        <p className="text-xs mt-1 text-gray-300">
          Los leads aparecerán cuando buscadores hagan click en tus propiedades
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: truncate(d.title, 22),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          label={{
            value: "Leads",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 11, fill: "#9ca3af" },
          }}
        />
        <Tooltip
          formatter={(value, name) => [
            value ?? 0,
            name === "leads" ? "Leads" : "Vistas",
          ]}
          labelFormatter={(label) => `Propiedad: ${label}`}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
