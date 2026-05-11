import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-key";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization") ?? "";
  const plain = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const userId = await validateApiKey(plain);
  if (!userId) {
    return NextResponse.json({ error: "API key inválida o inactiva" }, { status: 401 });
  }

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      country: { select: { code: true, name: true, currency: true } },
      city: { select: { id: true, name: true, lat: true, lng: true } },
      realtor: { select: { companyName: true, companyPhone: true, companyEmail: true, websiteUrl: true } },
    },
  });

  if (!property || property.status !== "ACTIVE") {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: property });
}
