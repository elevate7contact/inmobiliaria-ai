// src/app/api/countries/route.ts
// GET → lista Countries activos con sus Cities anidadas. Cacheable (revalidate 1h).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // 1h

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        cities: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, lat: true, lng: true },
        },
      },
    });
    return NextResponse.json({ countries });
  } catch (err) {
    console.error("GET /api/countries error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
