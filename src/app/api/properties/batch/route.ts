// src/app/api/properties/batch/route.ts
// Devuelve cards de propiedades dado un set de IDs (separados por coma).
// Usado por el ChatWidget para renderizar las cards que la IA citó.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("ids") ?? "";
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    if (!ids.length) return NextResponse.json({ properties: [] });

    const properties = await prisma.property.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      include: {
        city: { select: { name: true } },
        realtor: { select: { verificationStatus: true } },
      },
    });

    // Preservar el orden del request
    const byId = new Map(properties.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({
      properties: ordered.map((p) => ({
        id: p!.id,
        title: p!.title,
        price: p!.price,
        currency: p!.currency,
        bedrooms: p!.bedrooms,
        bathrooms: p!.bathrooms,
        areaM2: p!.areaM2,
        city: p!.city.name,
        firstPhoto: p!.photoUrls[0] ?? null,
        verified: p!.realtor.verificationStatus === "VERIFIED",
      })),
    });
  } catch (err) {
    console.error("GET /api/properties/batch error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
