import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) return NextResponse.json({ error: "Perfil de realtor no encontrado" }, { status: 404 });

  const properties = await prisma.property.findMany({
    where: { realtorId: realtor.id },
    orderBy: { createdAt: "desc" },
    include: {
      country: { select: { code: true, name: true } },
      city: { select: { name: true } },
    },
  });

  const headers = [
    "titulo", "tipo", "precio", "moneda", "habitaciones", "banos",
    "area_m2", "piso", "anio_construccion", "estado", "pais_codigo",
    "ciudad", "descripcion", "servicios", "enlace_directo", "vistas",
  ];

  const rows = properties.map((p) => [
    p.title,
    p.type,
    p.price,
    p.currency,
    p.bedrooms,
    p.bathrooms,
    p.areaM2,
    p.floor ?? "",
    p.yearBuilt ?? "",
    p.status,
    p.country.code,
    p.city.name,
    p.description,
    p.services.join("|"),
    p.directLink ?? "",
    p.viewCount,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="propiedades_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
