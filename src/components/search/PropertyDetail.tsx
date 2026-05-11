// src/components/search/PropertyDetail.tsx
// Modal con vista expandida de la propiedad: galería, specs, services, datos del realtor.

"use client";

import { useEffect } from "react";
import PhotoGallery from "./PhotoGallery";

type Realtor = {
  id: string;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
};

type Property = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  floor: number | null;
  yearBuilt: number | null;
  services: string[];
  photoUrls: string[];
  directLink: string | null;
  realtor: Realtor;
};

const SERVICE_LABEL: Record<string, string> = {
  pool: "Piscina",
  gym: "Gimnasio",
  parking: "Parqueadero",
  security: "Seguridad 24/7",
  balcony: "Balcón",
  "pet-friendly": "Pet-friendly",
};

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

export default function PropertyDetail({
  property,
  onClose,
}: {
  property: Property;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const mailtoSubject = encodeURIComponent(`Interés en ${property.title}`);
  const mailto = property.realtor.companyEmail
    ? `mailto:${property.realtor.companyEmail}?subject=${mailtoSubject}`
    : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{property.title}</h2>
            <p className="text-xl font-bold text-indigo-600">
              {formatPrice(property.price, property.currency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <PhotoGallery photos={property.photoUrls} alt={property.title} />

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Habitaciones</p>
              <p className="font-semibold">{property.bedrooms}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Baños</p>
              <p className="font-semibold">{property.bathrooms}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Área</p>
              <p className="font-semibold">{property.areaM2} m²</p>
            </div>
            {property.floor != null && (
              <div>
                <p className="text-xs text-gray-500">Piso</p>
                <p className="font-semibold">{property.floor}</p>
              </div>
            )}
            {property.yearBuilt != null && (
              <div>
                <p className="text-xs text-gray-500">Año</p>
                <p className="font-semibold">{property.yearBuilt}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Descripción</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
              {property.description}
            </p>
          </div>

          {property.services.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Servicios</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {property.services.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700"
                  >
                    {SERVICE_LABEL[s] ?? s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {property.realtor.companyName}
            </h3>
            <div className="mt-1 space-y-0.5 text-xs text-gray-600">
              {property.realtor.companyPhone && (
                <p>Tel: {property.realtor.companyPhone}</p>
              )}
              {property.realtor.companyEmail && (
                <p>Email: {property.realtor.companyEmail}</p>
              )}
              {property.realtor.websiteUrl && (
                <a
                  href={property.realtor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Sitio web ↗
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mailto && (
                <a
                  href={mailto}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Contactar realtor
                </a>
              )}
              {property.directLink && (
                <a
                  href={property.directLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-600"
                >
                  Ver original ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
