// src/app/api/stripe/webhook/route.ts
// Webhook endpoint para eventos de Stripe (suscripciones + facturación).
// IMPORTANTE: el body se lee crudo con `request.text()` ANTES de cualquier parseo JSON
// para que la verificación de firma con STRIPE_WEBHOOK_SECRET funcione.
//
// Eventos manejados:
//  - checkout.session.completed  → crea Subscription en DB
//  - customer.subscription.updated  → actualiza status / plan / currentPeriodEnd
//  - customer.subscription.deleted  → marca status='cancelled'
//  - invoice.paid                → crea Invoice 'paid'
//  - invoice.payment_failed      → marca Subscription.status='past_due'

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planFromPriceId, PLAN_METADATA } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Forzar runtime Node (no Edge) — necesitamos raw body + Prisma + crypto nativo
export const runtime = "nodejs";
// Evitar caching de respuestas de webhook
export const dynamic = "force-dynamic";

function periodEndFromSub(sub: Stripe.Subscription): Date {
  // Stripe usa unix timestamp seconds. En SDK 22.x, ciertos campos opcionales pueden no existir
  // según el snapshot de API. Tomamos el primero disponible o caemos a "ahora + 30d".
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const ts =
    anySub.current_period_end ??
    anySub.items?.data?.[0]?.current_period_end ??
    Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return new Date(ts * 1000);
}

async function findUserIdFromSub(sub: Stripe.Subscription): Promise<string | null> {
  // 1) metadata.userId puesto en checkout
  const metaUser = (sub.metadata as Record<string, string> | undefined)?.userId;
  if (metaUser) return metaUser;

  // 2) subscription ya guardada con stripeSubId
  const bySubId = await prisma.subscription.findUnique({
    where: { stripeSubId: sub.id },
    select: { userId: true },
  });
  if (bySubId) return bySubId.userId;

  // 3) por customer
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customerId) {
    const byCust = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });
    if (byCust) return byCust.userId;
  }
  return null;
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const userId = await findUserIdFromSub(sub);
  if (!userId) {
    console.warn(`webhook: no se pudo resolver userId para subscription ${sub.id}`);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const planKey = planFromPriceId(priceId) ?? "STARTER";
  const meta = PLAN_METADATA[planKey];
  const periodEnd = periodEndFromSub(sub);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: planKey,
      propertiesLimit: meta.propertiesLimit,
      priceMonthly: meta.priceMonthly,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      stripeSubId: sub.id,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      renewalDate: periodEnd,
    },
    update: {
      plan: planKey,
      propertiesLimit: meta.propertiesLimit,
      priceMonthly: meta.priceMonthly,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      stripeSubId: sub.id,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      renewalDate: periodEnd,
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET no configurado" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  // RAW BODY — NO parsear como JSON antes
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("webhook: firma inválida", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          // Inyectar userId desde la session si la subscription no lo tiene en metadata
          if (!sub.metadata?.userId && session.metadata?.userId) {
            (sub.metadata as Record<string, string>) = {
              ...(sub.metadata ?? {}),
              userId: session.metadata.userId,
            };
          }
          await upsertSubscriptionFromStripe(sub);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: "cancelled" },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as unknown as { subscription?: string | { id: string } };
        const subId =
          typeof invoiceAny.subscription === "string"
            ? invoiceAny.subscription
            : invoiceAny.subscription?.id;
        if (!subId) break;
        const subRecord = await prisma.subscription.findUnique({
          where: { stripeSubId: subId },
          select: { id: true },
        });
        if (!subRecord) {
          console.warn(`invoice.paid: subscription ${subId} no está en DB todavía`);
          break;
        }
        await prisma.invoice.upsert({
          where: { stripeInvoiceId: invoice.id ?? `inv_${Date.now()}` },
          create: {
            subscriptionId: subRecord.id,
            stripeInvoiceId: invoice.id ?? `inv_${Date.now()}`,
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: (invoice.currency ?? "usd").toUpperCase(),
            status: "paid",
            paidAt: new Date(),
          },
          update: {
            status: "paid",
            paidAt: new Date(),
            amount: (invoice.amount_paid ?? 0) / 100,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as unknown as { subscription?: string | { id: string } };
        const subId =
          typeof invoiceAny.subscription === "string"
            ? invoiceAny.subscription
            : invoiceAny.subscription?.id;
        if (!subId) break;
        await prisma.subscription.updateMany({
          where: { stripeSubId: subId },
          data: { status: "past_due" },
        });
        break;
      }

      default:
        // Ignoramos eventos no manejados (status 200 para que Stripe no reintente)
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
