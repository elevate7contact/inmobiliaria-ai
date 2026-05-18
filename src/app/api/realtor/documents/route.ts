// src/app/api/realtor/documents/route.ts
// Realtor sube/lista sus documentos de verificación.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_TYPES,
  REALTOR_DOCS_BUCKET,
  type DocumentTypeKey,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!realtor) {
      return NextResponse.json({ error: "No tenés perfil de inmobiliaria" }, { status: 404 });
    }

    const documents = await prisma.realtorDocument.findMany({
      where: { realtorId: realtor.id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (err) {
    console.error("GET /api/realtor/documents error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { type, fileUrl, filePath, fileName, fileSize, mimeType } = body ?? {};

    if (!DOCUMENT_TYPES.includes(type as DocumentTypeKey)) {
      return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
    }
    if (!fileUrl || !filePath || !fileName || !mimeType || typeof fileSize !== "number") {
      return NextResponse.json({ error: "Faltan campos del documento" }, { status: 400 });
    }

    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, verificationStatus: true },
    });
    if (!realtor) {
      return NextResponse.json({ error: "No tenés perfil de inmobiliaria" }, { status: 404 });
    }

    // Si ya hay doc del mismo tipo, borrar archivo viejo de Storage.
    const existing = await prisma.realtorDocument.findUnique({
      where: { realtorId_type: { realtorId: realtor.id, type } },
    });
    if (existing && existing.filePath !== filePath) {
      try {
        const admin = createAdminClient();
        await admin.storage.from(REALTOR_DOCS_BUCKET).remove([existing.filePath]);
      } catch (e) {
        console.error("No se pudo eliminar archivo viejo:", e);
      }
    }

    const doc = await prisma.realtorDocument.upsert({
      where: { realtorId_type: { realtorId: realtor.id, type } },
      create: {
        realtorId: realtor.id,
        type,
        fileUrl,
        filePath,
        fileName,
        fileSize,
        mimeType,
      },
      update: {
        fileUrl,
        filePath,
        fileName,
        fileSize,
        mimeType,
        uploadedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    // Si ya están los 4 docs → pasar a UNDER_REVIEW.
    const count = await prisma.realtorDocument.count({
      where: { realtorId: realtor.id },
    });
    if (count >= DOCUMENT_TYPES.length && realtor.verificationStatus !== "VERIFIED") {
      await prisma.realtorProfile.update({
        where: { id: realtor.id },
        data: { verificationStatus: "UNDER_REVIEW", rejectionReason: null },
      });
    }

    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("POST /api/realtor/documents error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
