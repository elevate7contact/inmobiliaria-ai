// src/app/api/user/preferences/route.ts
// GET/PATCH/DELETE de UserPreferenceProfile del usuario autenticado.
// Misma whitelist y validación de tipos que src/lib/ai/tools.ts (saveUserPreference).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

async function requireSearcher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, status: 401 as const };
  const role = (user.user_metadata?.role ?? "SEARCHER") as string;
  if (role !== "SEARCHER") return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}

export async function GET() {
  const auth = await requireSearcher();
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.status === 401 ? "No autenticado" : "No autorizado" },
      { status: auth.status }
    );
  }
  const profile = await prisma.userPreferenceProfile.findUnique({
    where: { userId: auth.user.id },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSearcher();
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.status === 401 ? "No autenticado" : "No autorizado" },
      { status: auth.status }
    );
  }

  let body: { field?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const f = body.field;
  let v = body.value;

  if (typeof f !== "string" || !ALLOWED_FIELDS.has(f)) {
    return NextResponse.json({ error: "Campo no permitido" }, { status: 400 });
  }

  // Permitimos null para limpiar el campo
  if (v !== null) {
    if (NUMERIC_FIELDS.has(f)) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
    } else if (STRING_ARRAY_FIELDS.has(f)) {
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
    } else if (f === "cityName") {
      if (typeof v !== "string") {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
    } else if (STRING_FIELDS.has(f)) {
      if (typeof v !== "string") {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
      if (f === "freeNotes" && v.length > FREENOTES_MAX_LEN) {
        v = v.slice(0, FREENOTES_MAX_LEN);
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (f === "cityName") {
    if (v === null) {
      updateData.cityId = null;
    } else if (typeof v === "string") {
      const city = await prisma.city.findFirst({
        where: { name: { equals: v, mode: "insensitive" } },
      });
      if (city) updateData.cityId = city.id;
      else return NextResponse.json({ error: "Ciudad no encontrada" }, { status: 400 });
    }
  } else {
    updateData[f] = v;
  }

  const createData: Record<string, unknown> = { userId: auth.user.id, ...updateData };
  // Para create necesitamos defaults sensatos en arrays
  if (STRING_ARRAY_FIELDS.has(f) && !Array.isArray(createData[f])) {
    createData[f] = [];
  }

  const profile = await prisma.userPreferenceProfile.upsert({
    where: { userId: auth.user.id },
    create: createData as Parameters<typeof prisma.userPreferenceProfile.upsert>[0]["create"],
    update: updateData,
  });

  return NextResponse.json({ profile });
}

export async function DELETE() {
  const auth = await requireSearcher();
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.status === 401 ? "No autenticado" : "No autorizado" },
      { status: auth.status }
    );
  }
  await prisma.userPreferenceProfile.deleteMany({
    where: { userId: auth.user.id },
  });
  return NextResponse.json({ ok: true });
}
