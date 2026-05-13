// src/app/api/highlights/[id]/route.ts
// DELETE — desactiva un highlight (el realtor dueño de la propiedad)

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Verificar que el highlight pertenece a una propiedad de este realtor
  const highlight = await prisma.highlight.findUnique({
    where: { id },
    include: { property: { select: { realtorId: true } } },
  });

  if (!highlight || highlight.property.realtorId !== realtor.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.highlight.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  return NextResponse.json({ ok: true });
}
