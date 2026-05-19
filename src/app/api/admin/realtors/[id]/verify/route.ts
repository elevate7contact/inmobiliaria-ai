// src/app/api/admin/realtors/[id]/verify/route.ts
// Admin aprueba o rechaza una inmobiliaria.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  sendVerificationApproved,
  sendVerificationRejected,
} from "@/lib/email";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const { action, reason } = (await req.json()) ?? {};

    const realtor = await prisma.realtorProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!realtor) {
      return NextResponse.json({ error: "Inmobiliaria no encontrada" }, { status: 404 });
    }

    const now = new Date();

    if (action === "approve") {
      const updated = await prisma.realtorProfile.update({
        where: { id },
        data: {
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          rejectionReason: null,
        },
      });
      await prisma.realtorDocument.updateMany({
        where: { realtorId: id },
        data: { reviewedBy: admin.id, reviewedAt: now, rejectionReason: null },
      });
      try {
        await sendVerificationApproved({
          to: realtor.user.email,
          name: realtor.user.name ?? "",
          companyName: realtor.companyName,
        });
      } catch (e) {
        console.error("[verify] sendVerificationApproved failed:", e);
      }
      return NextResponse.json({ realtor: updated });
    }

    if (action === "reject") {
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return NextResponse.json(
          { error: "Hace falta una razón para rechazar" },
          { status: 400 }
        );
      }
      const updated = await prisma.realtorProfile.update({
        where: { id },
        data: {
          verificationStatus: "REJECTED",
          rejectionReason: reason.trim(),
        },
      });
      await prisma.realtorDocument.updateMany({
        where: { realtorId: id },
        data: {
          reviewedBy: admin.id,
          reviewedAt: now,
          rejectionReason: reason.trim(),
        },
      });
      try {
        await sendVerificationRejected({
          to: realtor.user.email,
          name: realtor.user.name ?? "",
          companyName: realtor.companyName,
          reason: reason.trim(),
        });
      } catch (e) {
        console.error("[verify] sendVerificationRejected failed:", e);
      }
      return NextResponse.json({ realtor: updated });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/admin/realtors/[id]/verify error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
