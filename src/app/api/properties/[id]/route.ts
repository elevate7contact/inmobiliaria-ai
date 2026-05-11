// src/app/api/properties/[id]/route.ts
// GET: cualquier user (incluso anónimo) puede ver una propiedad por id.
// PATCH: solo el realtor dueño puede actualizar campos.
// DELETE: solo el realtor dueño. Soft delete (status -> INACTIVE), no borra fila.

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

const UpdatePropertySchema = z
  .object({
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
    floor: z.number().int().nullable().optional(),
    yearBuilt: z.number().int().nullable().optional(),
    services: z.array(z.string()).optional(),
    directLink: z.string().url().nullable().optional().or(z.literal("")),
    photoUrls: z.array(z.string().url()).max(6).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SOLD"]).optional(),
  })
  .partial();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        realtor: {
          select: {
            id: true,
            companyName: true,
            companyPhone: true,
            companyEmail: true,
            logoUrl: true,
            websiteUrl: true,
            verificationStatus: true,
          },
        },
        country: { select: { id: true, code: true, name: true } },
        city: { select: { id: true, name: true } },
      },
    });
    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ property });
  } catch (err) {
    console.error("GET /api/properties/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function requireOwner(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) {
    return {
      error: NextResponse.json(
        { error: "Solo inmobiliarias pueden modificar propiedades" },
        { status: 403 }
      ),
    };
  }

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, realtorId: true, status: true },
  });
  if (!property) {
    return {
      error: NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 }),
    };
  }
  if (property.realtorId !== realtor.id) {
    return {
      error: NextResponse.json(
        { error: "No tenés permiso para modificar esta propiedad" },
        { status: 403 }
      ),
    };
  }
  return { user, realtor, property };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOwner(id);
    if ("error" in auth) return auth.error;

    const json = await request.json();
    const parsed = UpdatePropertySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Si activan una propiedad, validar límite del plan
    if (data.status === "ACTIVE" && auth.property.status !== "ACTIVE") {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: auth.user.id },
        select: { propertiesLimit: true, status: true },
      });
      if (!subscription || subscription.status !== "active") {
        return NextResponse.json(
          { error: "Necesitás suscripción activa para activar propiedades" },
          { status: 403 }
        );
      }
      const activeCount = await prisma.property.count({
        where: { realtorId: auth.realtor.id, status: "ACTIVE" },
      });
      if (activeCount >= subscription.propertiesLimit) {
        return NextResponse.json(
          {
            error: `Alcanzaste el límite de ${subscription.propertiesLimit} propiedades activas. Hacé upgrade para activar más.`,
          },
          { status: 403 }
        );
      }
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...data,
        directLink:
          data.directLink === "" ? null : (data.directLink ?? undefined),
      },
    });

    return NextResponse.json({ property });
  } catch (err) {
    console.error("PATCH /api/properties/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOwner(id);
    if ("error" in auth) return auth.error;

    const property = await prisma.property.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json({ property });
  } catch (err) {
    console.error("DELETE /api/properties/[id] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
