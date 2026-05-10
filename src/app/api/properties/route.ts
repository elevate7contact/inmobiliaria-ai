// src/app/api/properties/route.ts
// CRUD básico de propiedades para realtors, con enforcement del límite del plan suscrito.
//
// POST /api/properties — crea una propiedad. Valida:
//   1) usuario logueado + rol REALTOR (o ADMIN)
//   2) tiene RealtorProfile
//   3) tiene Subscription activa
//   4) count(ACTIVE) < propertiesLimit del plan
// GET  /api/properties — lista las propiedades del realtor logueado.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const PROPERTY_TYPES = [
  "APARTMENT",
  "HOUSE",
  "LAND",
  "OFFICE",
  "COMMERCIAL",
] as const;

const CreatePropertySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  price: z.number().positive(),
  currency: z.string().min(2).max(8),
  type: z.enum(PROPERTY_TYPES),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  areaM2: z.number().positive(),
  countryId: z.string().min(1),
  cityId: z.string().min(1),
  floor: z.number().int().optional(),
  yearBuilt: z.number().int().optional(),
  services: z.array(z.string()).optional(),
  directLink: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).max(6).optional(),
});

async function requireRealtor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const role = user.user_metadata?.role ?? "SEARCHER";
  if (role !== "REALTOR" && role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Solo inmobiliarias pueden gestionar propiedades" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export async function POST(request: Request) {
  try {
    const auth = await requireRealtor();
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!realtor) {
      return NextResponse.json(
        { error: "Completá tu perfil de inmobiliaria antes de publicar" },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { propertiesLimit: true, status: true },
    });
    if (!subscription || subscription.status !== "active") {
      return NextResponse.json(
        { error: "Necesitás suscripción activa para publicar propiedades" },
        { status: 403 }
      );
    }

    const activeCount = await prisma.property.count({
      where: { realtorId: realtor.id, status: "ACTIVE" },
    });
    if (activeCount >= subscription.propertiesLimit) {
      return NextResponse.json(
        {
          error: `Alcanzaste el límite de ${subscription.propertiesLimit} propiedades de tu plan. Hacé upgrade para publicar más.`,
        },
        { status: 403 }
      );
    }

    const json = await request.json();
    const parsed = CreatePropertySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const property = await prisma.property.create({
      data: {
        realtorId: realtor.id,
        countryId: data.countryId,
        cityId: data.cityId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency,
        type: data.type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaM2: data.areaM2,
        floor: data.floor,
        yearBuilt: data.yearBuilt,
        services: data.services ?? [],
        directLink: data.directLink,
        photoUrls: data.photoUrls ?? [],
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireRealtor();
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!realtor) {
      return NextResponse.json({ properties: [] });
    }

    const properties = await prisma.property.findMany({
      where: { realtorId: realtor.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ properties });
  } catch (err) {
    console.error("GET /api/properties error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
