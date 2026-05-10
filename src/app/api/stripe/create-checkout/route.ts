// src/app/api/stripe/create-checkout/route.ts
// POST: crea una Stripe Checkout Session en modo `subscription` para el realtor logueado.
// Body esperado: { plan: 'PLAN_20' | 'PLAN_50' | 'PLAN_100' }.
// Devuelve: { url } con la URL hosted-checkout de Stripe.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLAN_PRICE_IDS, type PlanKey } from "@/lib/stripe";

const BodySchema = z.object({
  plan: z.enum(["PLAN_20", "PLAN_50", "PLAN_100"]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const role = user.user_metadata?.role ?? "SEARCHER";
    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo inmobiliarias pueden suscribirse" },
        { status: 403 }
      );
    }

    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Plan inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const plan: PlanKey = parsed.data.plan;
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Plan ${plan} no configurado (falta STRIPE_PRICE_${plan})` },
        { status: 500 }
      );
    }

    // Reusar customer si ya existe en la subscription. Si no, dejar que Stripe lo cree por email.
    const existing = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existing?.stripeCustomerId
        ? { customer: existing.stripeCustomerId }
        : {
            customer_email: user.email ?? undefined,
            customer_creation: "always",
          }),
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
      success_url: `${appUrl}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription?status=canceled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de checkout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return NextResponse.json(
      { error: "Error creando sesión de checkout" },
      { status: 500 }
    );
  }
}
