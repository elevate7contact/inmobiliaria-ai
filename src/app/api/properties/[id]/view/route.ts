import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Solo registrar vistas de usuarios autenticados para evitar inflación por bots
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Solo incrementar si la propiedad existe y está ACTIVE (evita datos basura)
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true },
    });
    if (!existing || existing.status !== "ACTIVE") {
      return NextResponse.json({ ok: true });
    }

    // Incrementar viewCount
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    // Registrar SearchMatch como clicked si hay un match pendiente
    const lastMatch = await prisma.searchMatch.findFirst({
      where: {
        propertyId,
        search: { userId: user.id },
        clicked: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastMatch) {
      await prisma.searchMatch.update({
        where: { id: lastMatch.id },
        data: { clicked: true, clickedAt: new Date() },
      });
    }

    return NextResponse.json({ viewCount: property.viewCount });
  } catch (err) {
    console.error("view error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
