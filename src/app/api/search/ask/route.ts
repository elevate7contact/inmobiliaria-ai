// src/app/api/search/ask/route.ts
// POST { query, countryCode } → invoca Claude para extraer criterios y crea fila Search.
// Si Claude detecta query ambiguo, devuelve needsClarification con preguntas sugeridas.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { extractSearchCriteria } from "@/lib/anthropic";

const BodySchema = z.object({
  query: z.string().min(1).max(500),
  countryCode: z.string().min(2).max(4),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { query, countryCode } = parsed.data;

    const result = await extractSearchCriteria(query, countryCode);
    if (!result.ok) {
      if (result.needsClarification) {
        return NextResponse.json({
          needsClarification: true,
          suggestions: result.suggestions ?? [],
          error: result.error,
        });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // userId opcional (búsqueda anónima permitida)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { criteria } = result;

    const search = await prisma.search.create({
      data: {
        userId: user?.id ?? null,
        countryId: criteria.countryId,
        cityId: criteria.cityId,
        budgetMin: criteria.budgetMin,
        budgetMax: criteria.budgetMax,
        bedrooms: criteria.bedrooms,
        bathrooms: criteria.bathrooms,
        type: criteria.type,
        services: criteria.services ?? [],
      },
      select: { id: true },
    });

    return NextResponse.json({ searchId: search.id, criteria });
  } catch (err) {
    console.error("POST /api/search/ask error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
