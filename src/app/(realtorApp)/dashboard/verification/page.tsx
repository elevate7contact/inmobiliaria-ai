// src/app/(realtorApp)/dashboard/verification/page.tsx
// Página de verificación del realtor.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import VerificationForm from "./VerificationForm";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!realtor) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-3xl font-bold text-gray-900">Verificación</h1>
        <p className="mt-2 text-gray-600">
          No tienes perfil de inmobiliaria todavía. Completa tu registro primero.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Verificación</h1>
        <p className="mt-1 text-gray-600">
          Sube los 4 documentos para que nuestro equipo revise tu inmobiliaria.
          Tarda 24–48 horas.
        </p>
      </header>

      <VerificationForm
        realtorId={realtor.id}
        status={realtor.verificationStatus}
        rejectionReason={realtor.rejectionReason}
        initialDocuments={realtor.documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileUrl: d.fileUrl,
          filePath: d.filePath,
          fileName: d.fileName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        }))}
      />
    </div>
  );
}
