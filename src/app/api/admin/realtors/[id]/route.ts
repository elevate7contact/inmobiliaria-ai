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
  const { verificationStatus } = await req.json();

  if (!["PENDING", "VERIFIED", "REJECTED"].includes(verificationStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const updated = await prisma.realtorProfile.update({
    where: { id },
    data: { verificationStatus },
    select: { id: true, verificationStatus: true, companyName: true },
  });

  return NextResponse.json(updated);
}
