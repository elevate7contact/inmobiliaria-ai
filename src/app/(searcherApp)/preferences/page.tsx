// src/app/(searcherApp)/preferences/page.tsx
// Lo que Vistaagent recuerda de vos. Editás o borrás.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PreferencesEditor } from "./PreferencesEditor";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userPreferenceProfile.findUnique({
    where: { userId: user.id },
  });

  // Resolvemos cityName a partir del cityId para el editor
  let cityName: string | null = null;
  if (profile?.cityId) {
    const city = await prisma.city.findUnique({ where: { id: profile.cityId } });
    cityName = city?.name ?? null;
  }

  return <PreferencesEditor initial={profile} initialCityName={cityName} />;
}
