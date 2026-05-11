// src/app/(realtorApp)/subscription/page.tsx
// Server component: muestra el estado de suscripción del realtor logueado.
// - Sin sub: 3 cards de pricing (STARTER, GROWTH, EMPIRE, este último MOST POPULAR).
// - Con sub: detalles + botón "Gestionar suscripción" (abre Stripe Customer Portal).

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PricingCards, ManageButton } from "./subscription-actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: "Activa", classes: "bg-green-100 text-green-800" },
  past_due: { label: "Pago atrasado", classes: "bg-amber-100 text-amber-800" },
  cancelled: { label: "Cancelada", classes: "bg-red-100 text-red-800" },
  canceled: { label: "Cancelada", classes: "bg-red-100 text-red-800" },
  incomplete: { label: "Incompleta", classes: "bg-gray-100 text-gray-800" },
  trialing: { label: "Trial", classes: "bg-blue-100 text-blue-800" },
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { status } = await searchParams;

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-gray-600">Necesitás iniciar sesión.</p>
      </main>
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  // Contar propiedades activas para mostrar uso vs límite
  let activeCount = 0;
  if (subscription) {
    const realtor = await prisma.realtorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (realtor) {
      activeCount = await prisma.property.count({
        where: { realtorId: realtor.id, status: "ACTIVE" },
      });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Suscripción</h1>
      <p className="mt-2 text-gray-600">
        Gestioná tu plan, facturación y método de pago.
      </p>

      {status === "success" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          ¡Listo! Tu suscripción quedó activa. Puede tardar unos segundos en
          reflejarse acá mientras procesamos el webhook.
        </div>
      )}
      {status === "canceled" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Cancelaste el checkout. Podés volver a intentar cuando quieras.
        </div>
      )}

      {subscription ? (
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Plan {subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase()}
                </h2>
                {(() => {
                  const b =
                    STATUS_BADGE[subscription.status] ??
                    STATUS_BADGE.incomplete;
                  return (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${b.classes}`}
                    >
                      {b.label}
                    </span>
                  );
                })()}
              </div>
              <p className="mt-2 text-gray-600">
                ${subscription.priceMonthly.toFixed(0)} USD / mes
              </p>
            </div>
            <ManageButton />
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Propiedades</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {activeCount}{" "}
                <span className="text-base font-normal text-gray-500">
                  / {subscription.propertiesLimit}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Próxima renovación
              </dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {new Date(subscription.renewalDate).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Periodo actual termina
              </dt>
              <dd className="mt-1 text-lg font-medium text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  "es-CO",
                  { day: "2-digit", month: "long", year: "numeric" }
                )}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <PricingCards />
      )}
    </main>
  );
}
