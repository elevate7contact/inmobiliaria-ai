import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  companyName: z.string().min(2).max(200),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = (clerkUser.publicMetadata?.role as string) ?? "SEARCHER";
    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo realtors pueden crear perfil de inmobiliaria" },
        { status: 403 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nombre de empresa requerido (2-200 caracteres)" },
        { status: 400 }
      );
    }

    const { companyName } = parsed.data;
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const name = clerkUser.fullName ?? "";

    const dbUser = await prisma.user.upsert({
      where: { email },
      update: { role: "REALTOR", name: name || undefined },
      create: {
        email,
        role: "REALTOR",
        name: name || null,
        emailVerified: true,
      },
    });

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
