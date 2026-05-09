import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, companyName } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar o crear User en DB
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: { role: "REALTOR", name: user.user_metadata?.name },
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
