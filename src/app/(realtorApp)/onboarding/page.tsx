// src/app/(realtorApp)/onboarding/page.tsx
// Guía paso a paso post-signup para realtors recién registrados.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import OnboardingChecklist, { type OnboardingStep } from "./OnboardingChecklist";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = (user.user_metadata?.role as string) ?? "SEARCHER";
  if (role !== "REALTOR" && role !== "ADMIN") {
    redirect("/search");
  }

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
    select: { status: true },
  });

  const activePropertiesCount = realtor
    ? await prisma.property.count({
        where: { realtorId: realtor.id, status: "ACTIVE" },
      })
    : 0;

  const profileComplete = Boolean(
    realtor &&
      realtor.companyName &&
      realtor.companyPhone &&
      realtor.companyEmail
  );

  const uniqueDocTypes = new Set(realtor?.documents.map((d) => d.type) ?? []);
  const documentsComplete = uniqueDocTypes.size >= 4;

  const subscriptionActive = subscription?.status === "active";
  const hasActiveProperty = activePropertiesCount > 0;

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Completá el perfil de tu empresa",
      description:
        "Agregá nombre, teléfono y email de tu inmobiliaria para que los compradores sepan quién sos.",
      completed: profileComplete,
      ctaLabel: profileComplete ? "Editar perfil" : "Completar perfil",
      ctaHref: "/dashboard/verification",
    },
    {
      id: "documents",
      title: "Subí los 4 documentos de verificación",
      description:
        "Registro de empresa, cámara de comercio, cédula del representante y carnet profesional.",
      completed: documentsComplete,
      ctaLabel: documentsComplete ? "Ver documentos" : "Subir documentos",
      ctaHref: "/dashboard/verification",
    },
    {
      id: "subscription",
      title: "Suscribite a un plan",
      description:
        "Elegí el plan que mejor se ajuste a tu volumen de propiedades. Sin plan activo no podés publicar.",
      completed: subscriptionActive,
      ctaLabel: subscriptionActive ? "Ver mi plan" : "Ver planes",
      ctaHref: "/subscription",
    },
    {
      id: "property",
      title: "Publicá tu primera propiedad",
      description:
        "Cargá tu primera propiedad activa y empezá a recibir compradores calificados.",
      completed: hasActiveProperty,
      ctaLabel: hasActiveProperty ? "Ver propiedades" : "Publicar propiedad",
      ctaHref: hasActiveProperty ? "/properties" : "/properties/new",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <OnboardingChecklist
        steps={steps}
        progress={progress}
        completedCount={completedCount}
        companyName={realtor?.companyName ?? null}
      />
    </div>
  );
}
