// src/components/realtor/PhotoUploadField.tsx
// Campo de fotos para PropertyForm.
// Modo CREATE: acumula files en estado local (no hay propertyId todavía).
//   El padre lee `pendingFiles` y los sube DESPUÉS de crear la property.
// Modo EDIT: sube directo a /api/properties/[id]/photos vía multipart, y permite borrar
//   individual con DELETE { photoUrl }.
// Máx 6 fotos por property. Tipos: jpg/png/webp. Max 5MB por foto.

"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export type PhotoUploadFieldProps = {
  propertyId?: string; // si está en edit
  initialUrls: string[];
  pendingFiles: File[];
  onUrlsChange: (urls: string[]) => void;
  onPendingFilesChange: (files: File[]) => void;
};

export default function PhotoUploadField({
  propertyId,
  initialUrls,
  pendingFiles,
  onUrlsChange,
  onPendingFilesChange,
}: PhotoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = initialUrls.length + pendingFiles.length;

  const validateFiles = (files: File[]): string | null => {
    if (totalCount + files.length > MAX_PHOTOS) {
      return `Máx ${MAX_PHOTOS} fotos (tenés ${totalCount}).`;
    }
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) return `Tipo no permitido: ${f.name}`;
      if (f.size > MAX_BYTES) return `"${f.name}" excede 5MB`;
    }
    return null;
  };

  const handleFiles = async (files: File[]) => {
    setError(null);
    const err = validateFiles(files);
    if (err) {
      setError(err);
      return;
    }

    if (!propertyId) {
      // CREATE: acumular en pendingFiles
      onPendingFilesChange([...pendingFiles, ...files]);
      return;
    }

    // EDIT: subir directo al backend
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("photos", f));
      const res = await fetch(`/api/properties/${propertyId}/photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error subiendo");
      onUrlsChange(data.property.photoUrls as string[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) void handleFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void handleFiles(files);
  };

  const removeUrl = async (url: string) => {
    setError(null);
    if (!propertyId) {
      onUrlsChange(initialUrls.filter((u) => u !== url));
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando");
      onUrlsChange(data.property.photoUrls as string[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setUploading(false);
    }
  };

  const removePending = (idx: number) => {
    const next = pendingFiles.slice();
    next.splice(idx, 1);
    onPendingFilesChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Fotos ({totalCount}/{MAX_PHOTOS})
        </label>
        {uploading && (
          <span className="text-xs text-gray-500">Subiendo...</span>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center"
      >
        <p className="text-sm text-gray-600">
          Arrastrá fotos acá o
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || totalCount >= MAX_PHOTOS}
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Subir fotos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED.join(",")}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <p className="mt-2 text-xs text-gray-500">
          JPG, PNG o WebP. Máx 5MB cada una. Máx {MAX_PHOTOS} fotos.
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      )}

      {(initialUrls.length > 0 || pendingFiles.length > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {initialUrls.map((url) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-lg border border-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                disabled={uploading}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          {pendingFiles.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={`${file.name}-${idx}`}
                className="group relative overflow-hidden rounded-lg border border-amber-300 bg-amber-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-24 w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-amber-600/80 px-1 py-0.5 text-[10px] text-white">
                  Pendiente
                </span>
                <button
                  type="button"
                  onClick={() => removePending(idx)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
