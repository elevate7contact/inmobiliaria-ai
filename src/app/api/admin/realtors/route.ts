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
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const where = status ? { verificationStatus: status } : {};

  const [realtors, total] = await Promise.all([
    prisma.realtorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { email: true, name: true, createdAt: true } },
        _count: { select: { properties: true } },
      },
    }),
    prisma.realtorProfile.count({ where }),
  ]);

  return NextResponse.json({ realtors, total, page, pages: Math.ceil(total / limit) });
}
