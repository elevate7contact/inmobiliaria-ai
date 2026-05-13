import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function GET() {
  try {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [
    totalUsers,
    totalRealtors,
    totalSearchers,
    totalProperties,
    activeProperties,
    totalSubscriptions,
    pendingRealtors,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "REALTOR" } }),
    prisma.user.count({ where: { role: "SEARCHER" } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.realtorProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalRealtors,
    totalSearchers,
    totalProperties,
    activeProperties,
    totalSubscriptions,
    pendingRealtors,
    recentUsers,
  });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
