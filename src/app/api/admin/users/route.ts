import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const where = {
    ...(role ? { role: role as "SEARCHER" | "REALTOR" | "ADMIN" } : {}),
    ...(search ? { OR: [
      { email: { contains: search, mode: "insensitive" as const } },
      { name: { contains: search, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, name: true, role: true,
        createdAt: true, emailVerified: true,
        realtorProfile: { select: { verificationStatus: true, companyName: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}
