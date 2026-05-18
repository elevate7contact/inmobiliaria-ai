"use client";

// src/app/(realtorApp)/dashboard/verification/VerificationForm.tsx
// 4 slots de upload de documentos.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  ALLOWED_DOC_TYPES,
  uploadRealtorDocument,
  type DocumentTypeKey,
} from "@/lib/verification";
import VerificationBanner from "@/components/VerificationBanner";

type DocRow = {
  id: string;
  type: string;
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

type Props = {
  realtorId: string;
  status: string;
  rejectionReason: string | null;
  initialDocuments: DocRow[];
};

export default function VerificationForm({
  realtorId,
  status,
  rejectionReason,
  initialDocuments,
}: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>(initialDocuments);
  const [uploading, setUploading] = useState<DocumentTypeKey | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docByType = (type: DocumentTypeKey): DocRow | undefined =>
    docs.find((d) => d.type === type);

  async function handleUpload(type: DocumentTypeKey, file: File) {
    setError(null);
    setUploading(type);
    try {
      const { publicUrl, path } = await uploadRealtorDocument(
        file,
        realtorId,
        type
      );
      const res = await fetch("/api/realtor/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          fileUrl: publicUrl,
          filePath: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error guardando documento");
      // Reemplazar/agregar en estado local.
      setDocs((prev) => {
        const without = prev.filter((d) => d.type !== type);
        return [...without, { ...data.document }];
      });
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Error subiendo documento");
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeleting(docId);
    setError(null);
    try {
      const res = await fetch(`/api/realtor/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error eliminando documento");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Error eliminando documento");
    } finally {
      setDeleting(null);
    }
  }

  const canEdit = status !== "VERIFIED";

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} rejectionReason={rejectionReason} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((type) => {
          const label = DOCUMENT_LABELS[type];
          const existing = docByType(type);
          const isUploading = uploading === type;

          return (
            <div
              key={type}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {label.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">{label.help}</p>
                </div>
                {existing && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Cargado
                  </span>
                )}
              </div>

              {existing ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <a
                      href={existing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-gray-900 hover:underline"
                    >
                      {existing.fileName}
                    </a>
                    <p className="text-xs text-gray-500">
                      {(existing.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
                        Reemplazar
                        <input
                          type="file"
                          className="hidden"
                          accept={ALLOWED_DOC_TYPES.join(",")}
                          disabled={isUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(type, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDelete(existing.id)}
                        disabled={deleting === existing.id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  {canEdit ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                      {isUploading ? "Subiendo..." : "Subir documento"}
                      <input
                        type="file"
                        className="hidden"
                        accept={ALLOWED_DOC_TYPES.join(",")}
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(type, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Tu inmobiliaria ya está verificada.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Formatos aceptados: JPG, PNG, WebP, PDF. Máximo 8MB por archivo.
      </p>
    </div>
  );
}
