// src/app/api/subscriptions/route.ts
// GET: devuelve la suscripción del usuario logueado o null si no tiene.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        plan: true,
        propertiesLimit: true,
        priceMonthly: true,
        status: true,
        currentPeriodEnd: true,
        renewalDate: true,
        // stripeCustomerId es datos internos de Stripe — no exponer al cliente
      },
    });

    return NextResponse.json({ subscription: sub });
  } catch (err) {
    console.error("GET /api/subscriptions error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
