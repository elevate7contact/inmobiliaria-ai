// src/lib/ai/tools.ts
// Tools que la IA puede llamar. Devuelven JSON-serializable data.
// Cero alucinación: si no hay match, devolvemos []. La IA debe interpretar.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ===== Tool schemas (formato Anthropic) =====
export const TOOL_DEFINITIONS = [
  {
    name: "search_properties",
    description:
      "Busca propiedades activas en la base de datos según los filtros dados. Devuelve hasta 10 resultados con datos reales. Usa esto siempre que el usuario pida ver opciones — nunca inventes propiedades.",
    input_schema: {
      type: "object" as const,
      properties: {
        countryCode: { type: "string", description: 'Código país, ej "CO".' },
        cityName: { type: "string", description: 'Nombre ciudad exacto, ej "Bogotá".' },
        budgetMin: { type: "number" },
        budgetMax: { type: "number" },
        currency: { type: "string", description: '"COP" o "USD".' },
        minBedrooms: { type: "number" },
        minBathrooms: { type: "number" },
        minAreaM2: { type: "number" },
        maxAreaM2: { type: "number" },
        propertyType: {
          type: "string",
          enum: ["APARTMENT", "HOUSE", "LAND", "OFFICE", "COMMERCIAL"],
        },
        services: {
          type: "array",
          items: { type: "string" },
          description:
            'Lista de servicios requeridos. Valores válidos: pool, gym, sauna, canchas, parking, bodega, elevator, security, clubhouse',
        },
        limit: { type: "number", description: "Máx 10. Default 5." },
      },
      required: [],
    },
  },
  {
    name: "get_property_details",
    description: "Devuelve la ficha completa de una propiedad por su ID. Úsalo cuando el usuario pida detalles específicos de una propiedad que ya vio.",
    input_schema: {
      type: "object" as const,
      properties: {
        propertyId: { type: "string" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "save_user_preference",
    description:
      "Guarda una preferencia del usuario para recordarla en futuras sesiones. Llámalo cada vez que el usuario diga algo concreto (presupuesto, barrio, m², servicios, features). Si el campo es array, REEMPLAZA el array completo — no acumula.",
    input_schema: {
      type: "object" as const,
      properties: {
        field: {
          type: "string",
          enum: [
            "budgetMin",
            "budgetMax",
            "currency",
            "cityName",
            "neighborhoods",
            "minBedrooms",
            "minBathrooms",
            "minAreaM2",
            "maxAreaM2",
            "propertyTypes",
            "services",
            "features",
            "preferFloorMin",
            "preferFloorMax",
            "freeNotes",
          ],
        },
        value: {
          description: "Valor a guardar. Número, string o array de strings según el campo.",
        },
      },
      required: ["field", "value"],
    },
  },
] as const;

// ===== Implementación =====

type SearchInput = {
  countryCode?: string;
  cityName?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  minBedrooms?: number;
  minBathrooms?: number;
  minAreaM2?: number;
  maxAreaM2?: number;
  propertyType?: string;
  services?: string[];
  limit?: number;
};

export async function searchProperties(input: SearchInput) {
  const where: Prisma.PropertyWhereInput = { status: "ACTIVE" };

  if (input.countryCode) {
    const country = await prisma.country.findUnique({ where: { code: input.countryCode } });
    if (country) where.countryId = country.id;
  }
  if (input.cityName) {
    const city = await prisma.city.findFirst({ where: { name: { equals: input.cityName, mode: "insensitive" } } });
    if (city) where.cityId = city.id;
  }
  const priceFilter: Prisma.FloatFilter = {};
  if (input.budgetMin != null) priceFilter.gte = input.budgetMin;
  if (input.budgetMax != null) priceFilter.lte = input.budgetMax;
  if (Object.keys(priceFilter).length) where.price = priceFilter;
  if (input.currency) where.currency = input.currency;
  if (input.minBedrooms != null) where.bedrooms = { gte: input.minBedrooms };
  if (input.minBathrooms != null) where.bathrooms = { gte: input.minBathrooms };
  const areaFilter: Prisma.FloatFilter = {};
  if (input.minAreaM2 != null) areaFilter.gte = input.minAreaM2;
  if (input.maxAreaM2 != null) areaFilter.lte = input.maxAreaM2;
  if (Object.keys(areaFilter).length) where.areaM2 = areaFilter;
  if (input.propertyType) where.type = input.propertyType as Prisma.PropertyWhereInput["type"];
  if (input.services && input.services.length) where.services = { hasEvery: input.services };

  const limit = Math.min(input.limit ?? 5, 10);

  const properties = await prisma.property.findMany({
    where,
    take: limit,
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    include: {
      city: { select: { name: true } },
      country: { select: { code: true, name: true } },
      realtor: { select: { companyName: true, verificationStatus: true } },
    },
  });

  return {
    count: properties.length,
    properties: properties.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency,
      type: p.type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      areaM2: p.areaM2,
      floor: p.floor,
      services: p.services,
      city: p.city.name,
      country: p.country.code,
      realtor: p.realtor.companyName,
      verified: p.realtor.verificationStatus === "VERIFIED",
      firstPhoto: p.photoUrls[0] ?? null,
    })),
  };
}

export async function getPropertyDetails(propertyId: string) {
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      city: { select: { name: true } },
      country: { select: { code: true, name: true } },
      realtor: { select: { companyName: true, companyPhone: true, companyEmail: true, verificationStatus: true } },
    },
  });
  if (!p) return { error: "Propiedad no encontrada." };
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    type: p.type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaM2: p.areaM2,
    floor: p.floor,
    yearBuilt: p.yearBuilt,
    services: p.services,
    photoUrls: p.photoUrls,
    city: p.city.name,
    country: p.country.name,
    realtor: p.realtor.companyName,
    realtorVerified: p.realtor.verificationStatus === "VERIFIED",
    realtorPhone: p.realtor.companyPhone,
    realtorEmail: p.realtor.companyEmail,
  };
}

type PreferenceInput = { field: string; value: unknown };

const ALLOWED_FIELDS = new Set([
  "budgetMin", "budgetMax", "currency", "cityName", "neighborhoods",
  "minBedrooms", "minBathrooms", "minAreaM2", "maxAreaM2",
  "propertyTypes", "services", "features",
  "preferFloorMin", "preferFloorMax", "freeNotes",
]);

const NUMERIC_FIELDS = new Set([
  "budgetMin", "budgetMax",
  "minBedrooms", "minBathrooms", "minAreaM2", "maxAreaM2",
  "preferFloorMin", "preferFloorMax",
]);

const STRING_FIELDS = new Set(["currency", "freeNotes"]);

const STRING_ARRAY_FIELDS = new Set([
  "neighborhoods", "propertyTypes", "services", "features",
]);

const FREENOTES_MAX_LEN = 1000;

export async function saveUserPreference(userId: string | null, input: PreferenceInput) {
  if (!userId) {
    // Visitante anónimo: no persistimos en DB. La conversación misma es el contexto.
    return { saved: false, reason: "anonymous_session" };
  }

  const f = input.field;
  let v = input.value;

  if (!ALLOWED_FIELDS.has(f)) {
    return { saved: false, reason: "field_not_allowed" };
  }

  // Validación de tipos
  if (NUMERIC_FIELDS.has(f)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { saved: false, reason: "type_mismatch" };
    }
  } else if (STRING_ARRAY_FIELDS.has(f)) {
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      return { saved: false, reason: "type_mismatch" };
    }
  } else if (f === "cityName") {
    if (typeof v !== "string") {
      return { saved: false, reason: "type_mismatch" };
    }
  } else if (STRING_FIELDS.has(f)) {
    if (typeof v !== "string") {
      return { saved: false, reason: "type_mismatch" };
    }
    if (f === "freeNotes" && v.length > FREENOTES_MAX_LEN) {
      v = v.slice(0, FREENOTES_MAX_LEN);
    }
  }

  const updateData: Record<string, unknown> = {};

  // Resolver cityName → cityId
  if (f === "cityName" && typeof v === "string") {
    const city = await prisma.city.findFirst({ where: { name: { equals: v, mode: "insensitive" } } });
    if (city) updateData.cityId = city.id;
  } else {
    updateData[f] = v;
  }

  const profile = await prisma.userPreferenceProfile.upsert({
    where: { userId },
    create: { userId, ...updateData },
    update: updateData,
  });

  return { saved: true, field: f, profileId: profile.id };
}

// ===== Dispatcher =====
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: string | null
): Promise<unknown> {
  try {
    switch (name) {
      case "search_properties":
        return await searchProperties(input as SearchInput);
      case "get_property_details":
        return await getPropertyDetails(input.propertyId as string);
      case "save_user_preference":
        return await saveUserPreference(userId, input as PreferenceInput);
      default:
        return { error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    console.error(`Tool ${name} error:`, err);
    return { error: "Error ejecutando la búsqueda. Intentá de nuevo." };
  }
}
