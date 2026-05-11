// src/app/(realtorApp)/layout.tsx
// Layout autenticado para realtors. Sidebar + topbar + content area.
// El proxy.ts ya restringe estas rutas a usuarios con rol REALTOR, pero por defensa
// también redirige acá si no se cumple.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import RealtorSidebar from "@/components/realtor/RealtorSidebar";

export default async function RealtorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata?.role as string) ?? "SEARCHER";
  if (role !== "REALTOR" && role !== "ADMIN") {
    redirect("/search");
  }

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <RealtorSidebar
          email={user.email ?? ""}
          companyName={realtor?.companyName ?? "Mi inmobiliaria"}
        />
        <main className="flex-1 md:pl-64">
          <div className="px-4 py-6 sm:px-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
