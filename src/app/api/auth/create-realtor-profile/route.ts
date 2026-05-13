// src/app/api/auth/create-realtor-profile/route.ts
// POST: crea/actualiza el perfil de realtor para el usuario autenticado.
// SEGURIDAD: usa SIEMPRE user.email del JWT de Supabase — nunca del body.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  companyName: z.string().min(2).max(200),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Validar que el usuario autenticado es REALTOR
    const role = user.user_metadata?.role ?? "SEARCHER";
    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Solo realtors pueden crear perfil de inmobiliaria" }, { status: 403 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Nombre de empresa requerido (2-200 caracteres)" }, { status: 400 });
    }

    const { companyName } = parsed.data;

    // Usar SIEMPRE el email del JWT autenticado, nunca del body
    const email = user.email!;

    // Buscar o crear User en DB
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: { role: "REALTOR", name: user.user_metadata?.name ?? undefined },
      create: {
        email,
        role: "REALTOR",
        name: user.user_metadata?.name ?? null,
        emailVerified: !!user.email_confirmed_at,
      },
    });

    // Crear RealtorProfile
    await prisma.realtorProfile.upsert({
      where: { userId: dbUser.id },
      update: { companyName },
      create: {
        userId: dbUser.id,
        companyName,
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({ message: "Perfil creado" });
  } catch (err) {
    console.error("create-realtor-profile error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
