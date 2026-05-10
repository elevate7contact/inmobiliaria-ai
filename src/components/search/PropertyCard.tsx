// src/components/search/PropertyCard.tsx
// Card de propiedad para grids de resultados. Click → onSelect (abre modal).

"use client";

import Image from "next/image";

export type PropertyForCard = {
  id: string;
  title: string;
  price: number;
  currency: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  photoUrls: string[];
  isHighlighted?: boolean;
  city?: { name: string } | null;
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

export default function PropertyCard({
  property,
  onSelect,
}: {
  property: PropertyForCard;
  onSelect: () => void;
}) {
  const cover = property.photoUrls[0];

  return (
    <button
      onClick={onSelect}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {cover ? (
          <Image
            src={cover}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Sin foto
          </div>
        )}
        {property.isHighlighted && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            Destacada
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">
          {property.title}
        </h3>
        <p className="text-base font-bold text-indigo-600">
          {formatPrice(property.price, property.currency)}
        </p>
        <div className="flex gap-3 text-xs text-gray-600">
          <span>{property.bedrooms} hab</span>
          <span>{property.bathrooms} baños</span>
          <span>{property.areaM2} m²</span>
        </div>
        {property.city && (
          <p className="text-xs text-gray-500">{property.city.name}</p>
        )}
      </div>
    </button>
  );
}
