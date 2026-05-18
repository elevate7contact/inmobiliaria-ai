// src/app/api/realtor/documents/[id]/route.ts
// Elimina un documento del realtor dueño.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPES, REALTOR_DOCS_BUCKET } from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, verificationStatus: true },
    });
    if (!realtor) {
      return NextResponse.json({ error: "No tenés perfil de inmobiliaria" }, { status: 404 });
    }

    const doc = await prisma.realtorDocument.findUnique({ where: { id } });
    if (!doc || doc.realtorId !== realtor.id) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    try {
      const admin = createAdminClient();
      await admin.storage.from(REALTOR_DOCS_BUCKET).remove([doc.filePath]);
    } catch (e) {
      console.error("Error borrando archivo storage:", e);
    }

    await prisma.realtorDocument.delete({ where: { id: doc.id } });

    // Si quedan menos de 4 docs y estaba UNDER_REVIEW → volver a PENDING.
    const count = await prisma.realtorDocument.count({
      where: { realtorId: realtor.id },
    });
    if (
      count < DOCUMENT_TYPES.length &&
      realtor.verificationStatus === "UNDER_REVIEW"
    ) {
      await prisma.realtorProfile.update({
        where: { id: realtor.id },
        data: { verificationStatus: "PENDING" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/realtor/documents/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
