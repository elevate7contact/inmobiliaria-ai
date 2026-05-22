import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import RealtorSidebar from "@/components/realtor/RealtorSidebar";

export default async function RealtorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const role = (user.publicMetadata?.role as string) ?? "SEARCHER";
  if (role !== "REALTOR" && role !== "ADMIN") redirect("/search");

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const realtor = await prisma.realtorProfile.findFirst({
    where: { user: { email } },
    select: { companyName: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <RealtorSidebar
          email={email}
          companyName={realtor?.companyName ?? "Mi inmobiliaria"}
        />
        <main className="flex-1 md:pl-64">
          <div className="px-4 py-6 sm:px-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
