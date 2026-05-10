import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es REALTOR
    const role = user.user_metadata?.role;
    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Timeframe desde query param: 7, 30, o "all"
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "30";

    const since =
      range === "all"
        ? new Date("2020-01-01")
        : new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000);

    // Obtener el perfil del realtor
    const realtorProfile = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!realtorProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    // Leads por propiedad (clicks desde búsquedas)
    const leadsPerProperty = await prisma.searchMatch.groupBy({
      by: ["propertyId"],
      where: {
        clicked: true,
        clickedAt: { gte: since },
        property: { realtorId: realtorProfile.id },
      },
      _count: { propertyId: true },
      orderBy: { _count: { propertyId: "desc" } },
      take: 10,
    });

    // Enriquecer con datos de las propiedades
    const propertyIds = leadsPerProperty.map((l: { propertyId: string }) => l.propertyId);
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, title: true, viewCount: true, status: true },
    });

    const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p]));

    const leadsData = leadsPerProperty.map((l: { propertyId: string; _count: { propertyId: number } }) => ({
      propertyId: l.propertyId,
      title: propertyMap[l.propertyId]?.title ?? "Propiedad eliminada",
      leads: l._count.propertyId,
      viewCount: propertyMap[l.propertyId]?.viewCount ?? 0,
    }));

    // Stats generales
    const [totalProperties, activeProperties, totalLeads, totalViews] =
      await Promise.all([
        prisma.property.count({ where: { realtorId: realtorProfile.id } }),
        prisma.property.count({
          where: { realtorId: realtorProfile.id, status: "ACTIVE" },
        }),
        prisma.searchMatch.count({
          where: {
            clicked: true,
            clickedAt: { gte: since },
            property: { realtorId: realtorProfile.id },
          },
        }),
        prisma.property.aggregate({
          where: { realtorId: realtorProfile.id },
          _sum: { viewCount: true },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalProperties,
        activeProperties,
        totalLeads,
        totalViews: totalViews._sum.viewCount ?? 0,
      },
      leadsPerProperty: leadsData,
      range,
    });
  } catch (err) {
    console.error("analytics error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
