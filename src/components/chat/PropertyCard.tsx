"use client";
// src/components/chat/PropertyCard.tsx
// Card compacta para mostrar dentro del chat. Click → navega al detalle.

import Link from "next/link";

export type PropertyCardData = {
  id: string;
  title: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  city: string;
  firstPhoto: string | null;
  verified?: boolean;
};

function formatPrice(price: number, currency: string): string {
  if (currency === "COP") {
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(0)}M COP`;
    return `$${price.toLocaleString("es-CO")} COP`;
  }
  return `$${price.toLocaleString("en-US")} ${currency}`;
}

export function PropertyCard({ data }: { data: PropertyCardData }) {
  return (
    <Link
      href={`/properties/${data.id}`}
      className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-2 transition hover:border-orange-300 hover:shadow-md"
    >
      <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {data.firstPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.firstPhoto}
            alt={data.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 text-sm font-semibold text-gray-900">{data.title}</h4>
          {data.verified && (
            <span className="flex-shrink-0 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
              ✓
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-orange-600">{formatPrice(data.price, data.currency)}</p>
        <p className="line-clamp-1 text-xs text-gray-500">
          {data.bedrooms} hab · {data.bathrooms} baños · {data.areaM2}m² · {data.city}
        </p>
      </div>
    </Link>
  );
}
