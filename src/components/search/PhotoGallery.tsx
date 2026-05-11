// src/components/search/PhotoGallery.tsx
// Galería de fotos con principal grande + thumbnails. Tap principal → fullscreen modal.

"use client";

import Image from "next/image";
import { useState } from "react";

export default function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [full, setFull] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
        Sin fotos
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setFull(true)}
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100"
      >
        <Image
          src={photos[idx]}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
        />
      </button>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={url + i}
              onClick={() => setIdx(i)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
                i === idx ? "border-indigo-500" : "border-transparent"
              }`}
            >
              <Image
                src={url}
                alt={`${alt} ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {full && (
        <div
          onClick={() => setFull(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative h-[80vh] w-full max-w-5xl">
            <Image
              src={photos[idx]}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFull(false);
            }}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900"
          >
            Cerrar
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx((i) => (i - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-gray-900"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx((i) => (i + 1) % photos.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-gray-900"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
