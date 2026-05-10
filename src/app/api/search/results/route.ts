// src/app/api/search/results/route.ts
// GET ?searchId=... — lee Search, matchea Properties con scoring, crea/actualiza SearchMatch.
// Filtros override por query params: priceMin, priceMax, type, services (comma-separated),
// bedrooms, bathrooms.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const VALID_TYPES = ["APARTMENT", "HOUSE", "LAND", "OFFICE", "COMMERCIAL"] as const;
type PropertyTypeLiteral = (typeof VALID_TYPES)[number];

function parseType(v: string | null): PropertyTypeLiteral | undefined {
  if (!v) return undefined;
  const upper = v.toUpperCase();
  return (VALID_TYPES as readonly string[]).includes(upper)
    ? (upper as PropertyTypeLiteral)
    : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get("searchId");
    if (!searchId) {
      return NextResponse.json({ error: "searchId requerido" }, { status: 400 });
    }

    const search = await prisma.search.findUnique({ where: { id: searchId } });
    if (!search) {
      return NextResponse.json({ error: "Búsqueda no encontrada" }, { status: 404 });
    }

    // Overrides desde query string
    const priceMinOv = searchParams.get("priceMin");
    const priceMaxOv = searchParams.get("priceMax");
    const typeOv = parseType(searchParams.get("type"));
    const bedroomsOv = searchParams.get("bedrooms");
    const bathroomsOv = searchParams.get("bathrooms");
    const servicesOv = searchParams.get("services");

    const budgetMin =
      priceMinOv != null ? Number(priceMinOv) : search.budgetMin ?? undefined;
    const budgetMax =
      priceMaxOv != null ? Number(priceMaxOv) : search.budgetMax ?? undefined;
    const propType = typeOv ?? (search.type as PropertyTypeLiteral | null) ?? undefined;
    const bedrooms =
      bedroomsOv != null ? Number(bedroomsOv) : search.bedrooms ?? undefined;
    const bathrooms =
      bathroomsOv != null ? Number(bathroomsOv) : search.bathrooms ?? undefined;
    const services = servicesOv
      ? servicesOv.split(",").map((s) => s.trim()).filter(Boolean)
      : search.services ?? [];

    const where: Prisma.PropertyWhereInput = {
      countryId: search.countryId,
      status: "ACTIVE",
    };
    if (budgetMin != null && budgetMax != null) {
      where.price = { gte: budgetMin, lte: budgetMax };
    } else if (budgetMin != null) {
      where.price = { gte: budgetMin };
    } else if (budgetMax != null) {
      where.price = { lte: budgetMax };
    }
    if (propType) where.type = propType;
    if (bedrooms != null) where.bedrooms = { gte: bedrooms };
    if (bathrooms != null) where.bathrooms = { gte: bathrooms };
    if (services.length > 0) where.services = { hasEvery: services };

    const properties = await prisma.property.findMany({
      where,
      include: {
        city: true,
        country: true,
        realtor: {
          select: {
            id: true,
            companyName: true,
            companyEmail: true,
            companyPhone: true,
            websiteUrl: true,
            logoUrl: true,
          },
        },
        highlights: {
          where: { status: "ACTIVE", activeUntil: { gt: new Date() } },
          select: { id: true, activeUntil: true },
        },
      },
      take: 100, // cap inicial; ordenamos por relevancia y cortamos a 20
    });

    // Scoring + upsert SearchMatch
    const scored = properties.map((p) => {
      let relevance = 1.0;
      if (search.cityId && p.cityId === search.cityId) relevance += 0.2;
      const matchedServices = services.filter((s) => p.services.includes(s)).length;
      if (matchedServices > 3) relevance += 0.1;
      if (p.highlights.length > 0) relevance += 0.15;
      return { property: p, relevance };
    });

    scored.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return b.property.viewCount - a.property.viewCount;
    });

    const top = scored.slice(0, 20);

    // Persistir SearchMatch (upsert por unique [searchId, propertyId])
    await Promise.all(
      top.map(({ property, relevance }) =>
        prisma.searchMatch.upsert({
          where: {
            searchId_propertyId: { searchId: search.id, propertyId: property.id },
          },
          update: { relevance },
          create: { searchId: search.id, propertyId: property.id, relevance },
        })
      )
    );

    return NextResponse.json({
      searchId: search.id,
      count: top.length,
      properties: top.map(({ property, relevance }) => ({
        ...property,
        relevance,
        isHighlighted: property.highlights.length > 0,
      })),
    });
  } catch (err) {
    console.error("GET /api/search/results error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
