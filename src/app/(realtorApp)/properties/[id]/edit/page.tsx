// src/app/(realtorApp)/properties/[id]/edit/page.tsx
// Página para editar una propiedad. Verifica que el realtor logueado sea dueño.

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PropertyForm, {
  type InitialProperty,
} from "@/components/realtor/PropertyForm";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) redirect("/dashboard");

  const property = await prisma.property.findUnique({
    where: { id },
  });
  if (!property) notFound();
  if (property.realtorId !== realtor.id) {
    redirect("/properties");
  }

  const initial: InitialProperty = {
    id: property.id,
    title: property.title,
    description: property.description,
    price: property.price,
    currency: property.currency,
    type: property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaM2: property.areaM2,
    countryId: property.countryId,
    cityId: property.cityId,
    floor: property.floor,
    yearBuilt: property.yearBuilt,
    services: property.services,
    directLink: property.directLink,
    photoUrls: property.photoUrls,
    lat: property.lat,
    lng: property.lng,
    status: property.status as "ACTIVE" | "INACTIVE" | "SOLD",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar propiedad</h1>
          <p className="mt-1 text-sm text-gray-600">
            Estado actual: <span className="font-medium">{property.status}</span>
            {" "}·{" "}
            <span className="font-medium">{property.viewCount}</span> vistas
          </p>
        </div>
      </header>
      <PropertyForm mode="edit" initial={initial} />
    </div>
  );
}
