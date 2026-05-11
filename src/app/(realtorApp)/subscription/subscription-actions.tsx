// src/app/(realtorApp)/subscription/subscription-actions.tsx
// Client components con las interacciones del panel de suscripción:
//   - PricingCards: muestra los 3 planes y dispara checkout
//   - ManageButton: abre el Customer Portal de Stripe

"use client";

import { useState } from "react";

type PlanKey = "STARTER" | "GROWTH" | "EMPIRE";

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: number;
  limit: number;
  perks: string[];
  popular?: boolean;
}> = [
  {
    key: "STARTER",
    name: "Starter",
    price: 29,
    limit: 20,
    perks: [
      "Hasta 20 propiedades activas",
      "Matching automático con búsquedas",
      "Dashboard de analíticas básicas",
    ],
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: 60,
    limit: 50,
    perks: [
      "Hasta 50 propiedades activas",
      "Matching prioritario",
      "Soporte por chat",
    ],
  },
  {
    key: "EMPIRE",
    name: "Empire",
    price: 120,
    limit: 100,
    perks: [
      "Hasta 100 propiedades activas",
      "Highlights destacados",
      "Soporte premium",
    ],
    popular: true,
  },
];

export function PricingCards() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanKey) {
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo iniciar el checkout");
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de red. Probá de nuevo.");
      setLoadingPlan(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-gray-900">Elegí tu plan</h2>
      <p className="mt-2 text-gray-600">
        Cancelás o cambiás cuando quieras desde el portal.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
              p.popular
                ? "border-indigo-500 ring-2 ring-indigo-500"
                : "border-gray-200"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 right-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
            <p className="mt-4">
              <span className="text-4xl font-bold text-gray-900">
                ${p.price}
              </span>
              <span className="ml-1 text-gray-500">/mes</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Hasta {p.limit} propiedades
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2">
                  <span className="text-indigo-600">✓</span> {perk}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(p.key)}
              disabled={loadingPlan !== null}
              className={`mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                p.popular
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loadingPlan === p.key ? "Redirigiendo..." : "Suscribirme"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ManageButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir el portal");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de red");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? "Abriendo..." : "Gestionar suscripción"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
