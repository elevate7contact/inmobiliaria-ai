// src/lib/stripe.ts
// Cliente Stripe singleton (server-only).
// Valida que STRIPE_SECRET_KEY exista en runtime y exporta una instancia única.
// La API version está pineada a la última soportada por el SDK stripe 22.x para evitar drift.

import Stripe from "stripe";

declare global {
  // eslint-disable-next-line no-var
  var __stripe: Stripe | undefined;
}

/**
 * Lazy getter del cliente Stripe. NO se inicializa hasta la primera invocación.
 * Esto previene que las páginas que NO usan Stripe (/, /search, etc) crasheen
 * cuando STRIPE_SECRET_KEY no está configurada en el entorno.
 */
export function getStripe(): Stripe {
  if (globalThis.__stripe) return globalThis.__stripe;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY no está definida. Configurá la variable de entorno."
    );
  }
  globalThis.__stripe = new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "inmobiliaria-ai",
      version: "0.1.0",
    },
  });
  return globalThis.__stripe;
}

// Mapeo plan → priceId desde env vars
export const PLAN_PRICE_IDS: Record<
  "PLAN_20" | "PLAN_50" | "PLAN_100",
  string | undefined
> = {
  PLAN_20: process.env.STRIPE_PRICE_PLAN_20,
  PLAN_50: process.env.STRIPE_PRICE_PLAN_50,
  PLAN_100: process.env.STRIPE_PRICE_PLAN_100,
};

// Mapeo plan → metadata estática (límite + precio mostrado en UI)
export const PLAN_METADATA = {
  PLAN_20: { propertiesLimit: 20, priceMonthly: 29 },
  PLAN_50: { propertiesLimit: 50, priceMonthly: 49 },
  PLAN_100: { propertiesLimit: 100, priceMonthly: 79 },
} as const;

export type PlanKey = keyof typeof PLAN_METADATA;

// Reverse lookup: priceId → plan key. Útil en webhooks cuando solo recibimos priceId.
export function planFromPriceId(priceId: string | undefined | null): PlanKey | null {
  if (!priceId) return null;
  if (priceId === PLAN_PRICE_IDS.PLAN_20) return "PLAN_20";
  if (priceId === PLAN_PRICE_IDS.PLAN_50) return "PLAN_50";
  if (priceId === PLAN_PRICE_IDS.PLAN_100) return "PLAN_100";
  return null;
}
