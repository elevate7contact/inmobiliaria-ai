// src/app/api/subscriptions/portal/route.ts
// POST: crea una Stripe Customer Portal Session para que el realtor gestione su suscripción.
// Devuelve: { url } al portal hosteado por Stripe.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST() {
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
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No tenés suscripción activa todavía" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const portal = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/subscription`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("POST /api/subscriptions/portal error:", err);
    return NextResponse.json(
      { error: "Error creando portal de Stripe" },
      { status: 500 }
    );
  }
}
