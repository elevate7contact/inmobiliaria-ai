// src/lib/upload.ts
// Helpers para subir/eliminar fotos de propiedades en Supabase Storage.
// Bucket: "property-photos" (asumido público, creado manualmente por el founder).
// Estructura de paths: {realtorId}/{propertyId}/{timestamp}-{sanitizeFilename(file.name)}

import { createClient } from "@/lib/supabase/client";

const BUCKET = "property-photos";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type UploadResult = {
  publicUrl: string;
  path: string;
};

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Sube una foto al bucket de Supabase Storage.
 * Devuelve la URL pública y el path interno (para eliminar luego).
 * Lanza Error con mensaje legible si falla la validación o el upload.
 */
export async function uploadPropertyPhoto(
  file: File,
  realtorId: string,
  propertyId: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}. Usá JPG, PNG o WebP.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Foto muy pesada: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 5MB.`
    );
  }

  const supabase = createClient();
  const path = `${realtorId}/${propertyId}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Error subiendo foto: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/**
 * Elimina una foto del bucket. Recibe el path completo dentro del bucket.
 */
export async function deletePropertyPhoto(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Dado un publicUrl de Supabase, extrae el path interno del bucket.
 * Devuelve null si la URL no corresponde a nuestro bucket.
 */
export function publicUrlToPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export const PROPERTY_PHOTOS_BUCKET = BUCKET;
export const MAX_PHOTO_BYTES = MAX_BYTES;
export const ALLOWED_PHOTO_TYPES = ALLOWED_TYPES;
