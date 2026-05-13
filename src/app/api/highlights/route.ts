// src/app/api/highlights/route.ts
// GET  — lista highlights activos del realtor
// POST — crea un highlight para una propiedad ($5 USD, 30 días)

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/highlights → { highlights: [{ id, propertyId, activeUntil, costExtra }] }
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) return NextResponse.json({ highlights: [] });

  const highlights = await prisma.highlight.findMany({
    where: {
      property: { realtorId: realtor.id },
      status: "ACTIVE",
      activeUntil: { gt: new Date() },
    },
    select: {
      id: true,
      propertyId: true,
      costExtra: true,
      activeUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ highlights });
}

// POST /api/highlights  body: { propertyId }
// Crea highlight de 30 días por $5 USD ligado a la suscripción activa del realtor.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { propertyId } = body as { propertyId?: string };
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId requerido" }, { status: 400 });
  }

  // Verificar que la propiedad pertenece al realtor
  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) {
    return NextResponse.json({ error: "Perfil de realtor no encontrado" }, { status: 404 });
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, realtorId: realtor.id, status: "ACTIVE" },
  });
  if (!property) {
    return NextResponse.json(
      { error: "Propiedad no encontrada o no activa" },
      { status: 404 }
    );
  }

  // Verificar suscripción activa
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json(
      { error: "Necesitas una suscripción activa para destacar propiedades" },
      { status: 403 }
    );
  }

  // ¿Ya tiene highlight activo?
  const existing = await prisma.highlight.findUnique({
    where: { propertyId },
    select: { id: true, status: true, activeUntil: true },
  });
  if (existing && existing.status === "ACTIVE" && existing.activeUntil > new Date()) {
    return NextResponse.json(
      { error: "Esta propiedad ya tiene un highlight activo" },
      { status: 409 }
    );
  }

  const COST_USD = 5;
  const activeUntil = new Date();
  activeUntil.setDate(activeUntil.getDate() + 30);

  let highlight;
  if (existing) {
    // Reactivar si el highlight expiró o estaba inactivo
    highlight = await prisma.highlight.update({
      where: { propertyId },
      data: {
        subscriptionId: subscription.id,
        costExtra: COST_USD,
        status: "ACTIVE",
        activeUntil,
      },
    });
  } else {
    highlight = await prisma.highlight.create({
      data: {
        propertyId,
        subscriptionId: subscription.id,
        costExtra: COST_USD,
        status: "ACTIVE",
        activeUntil,
      },
    });
  }

  return NextResponse.json({ highlight }, { status: 201 });
}
