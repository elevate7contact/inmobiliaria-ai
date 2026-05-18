// src/lib/verification.ts
// Helpers para subir/eliminar documentos de verificación de inmobiliarias.
// Bucket: "realtor-documents" (privado, creado manualmente).
// Path: {realtorId}/{type}/{timestamp}-{sanitizeFilename(file.name)}

import { createClient } from "@/lib/supabase/client";

export const REALTOR_DOCS_BUCKET = "realtor-documents";
export const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_DOC_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const DOCUMENT_TYPES = [
  "COMPANY_REGISTRATION",
  "COMPANY_PROOF",
  "PERSONAL_ID",
  "PROFESSIONAL_LICENSE",
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentTypeKey, { title: string; help: string }> = {
  COMPANY_REGISTRATION: {
    title: "Registro de la inmobiliaria",
    help: "RUT, NIT o registro mercantil que muestra el nombre legal de tu inmobiliaria.",
  },
  COMPANY_PROOF: {
    title: "Prueba de que la empresa es real",
    help: "Certificado de Cámara de Comercio, contrato de arrendamiento de oficina, o documento equivalente.",
  },
  PERSONAL_ID: {
    title: "Carnet / cédula del representante",
    help: "Documento de identidad del responsable legal o representante de la inmobiliaria.",
  },
  PROFESSIONAL_LICENSE: {
    title: "Carnet profesional inmobiliario",
    help: "Licencia, matrícula o carnet que acredita tu actividad como agente inmobiliario.",
  },
};

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export type UploadDocResult = {
  publicUrl: string;
  path: string;
};

export async function uploadRealtorDocument(
  file: File,
  realtorId: string,
  type: DocumentTypeKey
): Promise<UploadDocResult> {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}. Usá JPG, PNG, WebP o PDF.`);
  }
  if (file.size > MAX_DOC_BYTES) {
    throw new Error(
      `Documento muy pesado: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 8MB.`
    );
  }

  const supabase = createClient();
  const path = `${realtorId}/${type}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage
    .from(REALTOR_DOCS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Error subiendo documento: ${error.message}`);
  }

  const { data } = supabase.storage.from(REALTOR_DOCS_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function deleteRealtorDocument(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(REALTOR_DOCS_BUCKET).remove([path]);
}
