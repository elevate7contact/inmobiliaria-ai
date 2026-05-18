// src/app/(adminApp)/admin/realtors/[id]/verify/page.tsx
// Admin revisa documentos de una inmobiliaria y aprueba/rechaza.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_LABELS, type DocumentTypeKey } from "@/lib/verification";
import VerifyActions from "./VerifyActions";

export const dynamic = "force-dynamic";

export default async function AdminVerifyRealtorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const realtor = await prisma.realtorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      documents: true,
    },
  });

  if (!realtor) notFound();

  const docsByType = new Map(realtor.documents.map((d) => [d.type, d]));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{realtor.companyName}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {realtor.user.email}
          {realtor.companyPhone ? ` · ${realtor.companyPhone}` : ""}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Estado actual:{" "}
          <span className="font-mono text-gray-300">
            {realtor.verificationStatus}
          </span>
        </p>
        {realtor.rejectionReason && (
          <p className="text-red-400 text-xs mt-1 whitespace-pre-wrap">
            Rechazo previo: {realtor.rejectionReason}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(DOCUMENT_LABELS) as DocumentTypeKey[]).map((type) => {
          const doc = docsByType.get(type);
          const label = DOCUMENT_LABELS[type];
          return (
            <div
              key={type}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4"
            >
              <h3 className="text-sm font-semibold text-white">
                {label.title}
              </h3>
              <p className="mt-1 text-xs text-gray-500">{label.help}</p>
              {doc ? (
                <div className="mt-3 space-y-1">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-indigo-300 hover:underline"
                  >
                    {doc.fileName}
                  </a>
                  <p className="text-xs text-gray-500">
                    {(doc.fileSize / 1024 / 1024).toFixed(2)} MB · {doc.mimeType}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-red-400">No subido</p>
              )}
            </div>
          );
        })}
      </div>

      <VerifyActions
        realtorId={realtor.id}
        currentStatus={realtor.verificationStatus}
      />
    </div>
  );
}
