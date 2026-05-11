import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-key";

// GET /api/v1/properties — lista propiedades activas del realtor dueño de la key
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const plain = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const userId = await validateApiKey(plain);
  if (!userId) {
    return NextResponse.json({ error: "API key inválida o inactiva" }, { status: 401 });
  }

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!realtor) {
    return NextResponse.json({ error: "Perfil de realtor no encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const type = searchParams.get("type") ?? undefined;
  const cityId = searchParams.get("city_id") ?? undefined;

  const where = {
    realtorId: realtor.id,
    status: "ACTIVE" as const,
    ...(type ? { type: type.toUpperCase() as "APARTMENT" | "HOUSE" | "LAND" | "OFFICE" | "COMMERCIAL" } : {}),
    ...(cityId ? { cityId } : {}),
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, title: true, type: true, price: true, currency: true,
        bedrooms: true, bathrooms: true, areaM2: true, floor: true,
        yearBuilt: true, services: true, directLink: true, photoUrls: true,
        viewCount: true, createdAt: true,
        country: { select: { code: true, name: true } },
        city: { select: { id: true, name: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({
    data: properties,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
