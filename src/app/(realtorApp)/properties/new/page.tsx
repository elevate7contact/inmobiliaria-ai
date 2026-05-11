// src/app/(realtorApp)/properties/new/page.tsx
// Página para crear una nueva propiedad. Si no hay suscripción activa, redirige a /subscription.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PropertyForm from "@/components/realtor/PropertyForm";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout redirige

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  if (!subscription || subscription.status !== "active") {
    redirect("/subscription");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Nueva propiedad</h1>
        <p className="mt-1 text-sm text-gray-600">
          Completá los datos. Podés guardar como borrador y volver luego.
        </p>
      </header>
      <PropertyForm mode="create" />
    </div>
  );
}
