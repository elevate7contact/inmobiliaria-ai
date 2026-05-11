// src/app/api/search/save/route.ts
// POST { searchId, name } → guarda búsqueda para el user logueado.
// GET → lista las SavedSearch del user.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const SaveSchema = z.object({
  searchId: z.string().min(1),
  name: z.string().min(1).max(120),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  return { user };
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const json = await request.json();
    const parsed = SaveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const saved = await prisma.savedSearch.upsert({
      where: {
        userId_searchId: { userId: auth.user.id, searchId: parsed.data.searchId },
      },
      update: { name: parsed.data.name },
      create: {
        userId: auth.user.id,
        searchId: parsed.data.searchId,
        name: parsed.data.name,
      },
    });

    return NextResponse.json({ saved });
  } catch (err) {
    console.error("POST /api/search/save error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const saved = await prisma.savedSearch.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      include: { search: true },
    });

    return NextResponse.json({ saved });
  } catch (err) {
    console.error("GET /api/search/save error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
