// src/app/(realtorApp)/dashboard/page.tsx
// Dashboard del realtor: stats globales, banner si no tiene plan, últimas 5 propiedades.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardStats from "@/components/realtor/DashboardStats";
import OnboardingBanner from "@/components/OnboardingBanner";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-700",
  SOLD: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout ya redirige

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      companyName: true,
      companyPhone: true,
      companyEmail: true,
      documents: { select: { type: true } },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true, propertiesLimit: true },
  });

  // Onboarding progress (mismos 4 steps que /onboarding)
  const activePropertiesForOnboarding = realtor
    ? await prisma.property.count({
        where: { realtorId: realtor.id, status: "ACTIVE" },
      })
    : 0;

  const onboardingChecks = [
    {
      label: "Perfil de empresa",
      done: Boolean(
        realtor &&
          realtor.companyName &&
          realtor.companyPhone &&
          realtor.companyEmail
      ),
    },
    {
      label: "Documentos de verificación",
      done:
        new Set(realtor?.documents.map((d) => d.type) ?? []).size >= 4,
    },
    {
      label: "Suscripción activa",
      done: subscription?.status === "active",
    },
    {
      label: "Primera propiedad",
      done: activePropertiesForOnboarding > 0,
    },
  ];
  const onboardingDone = onboardingChecks.filter((c) => c.done).length;
  const onboardingPercent = Math.round(
    (onboardingDone / onboardingChecks.length) * 100
  );
  const onboardingMissing = onboardingChecks
    .filter((c) => !c.done)
    .map((c) => c.label);

  let totalProperties = 0;
  let activeProperties = 0;
  let totalViews = 0;
  let withHighlights = 0;
  let recent: Array<{
    id: string;
    title: string;
    status: string;
    price: number;
    currency: string;
    viewCount: number;
    createdAt: Date;
  }> = [];

  if (realtor) {
    const [counts, viewsAgg, highlightsCount, recentList] = await Promise.all([
      prisma.property.groupBy({
        by: ["status"],
        where: { realtorId: realtor.id },
        _count: { _all: true },
      }),
      prisma.property.aggregate({
        where: { realtorId: realtor.id },
        _sum: { viewCount: true },
      }),
      prisma.highlight.count({
        where: {
          status: "ACTIVE",
          property: { realtorId: realtor.id },
        },
      }),
      prisma.property.findMany({
        where: { realtorId: realtor.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          currency: true,
          viewCount: true,
          createdAt: true,
        },
      }),
    ]);

    totalProperties = counts.reduce((a, c) => a + c._count._all, 0);
    activeProperties =
      counts.find((c) => c.status === "ACTIVE")?._count._all ?? 0;
    totalViews = viewsAgg._sum.viewCount ?? 0;
    withHighlights = highlightsCount;
    recent = recentList;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <OnboardingBanner
        percentComplete={onboardingPercent}
        missingSteps={onboardingMissing}
      />
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Hola{realtor ? `, ${realtor.companyName}` : ""}. Acá tenés el resumen
          de tus propiedades.
        </p>
      </header>

      {(!subscription || subscription.status !== "active") && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">
            Activá tu plan para empezar a publicar
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Necesitás una suscripción activa para crear propiedades visibles a
            compradores.
          </p>
          <Link
            href="/subscription"
            className="mt-4 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Ver planes
          </Link>
        </div>
      )}

      <DashboardStats
        stats={{
          totalProperties,
          activeProperties,
          totalViews,
          withHighlights,
        }}
      />

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Últimas propiedades
          </h2>
          <Link
            href="/properties"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Ver todas →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-600">Todavía no publicaste propiedades.</p>
            <Link
              href="/properties/new"
              className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Publicar primera propiedad
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/properties/${p.id}/edit`}
                    className="block truncate text-sm font-medium text-gray-900 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString("es-CO")} ·{" "}
                    {p.viewCount} vistas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">
                    {p.price.toLocaleString("es-CO")} {p.currency}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
