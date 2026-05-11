import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["ACTIVE", "INACTIVE", "SOLD"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status },
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
