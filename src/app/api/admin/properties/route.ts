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
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const where = {
    ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "SOLD" } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        country: { select: { name: true } },
        city: { select: { name: true } },
        realtor: { select: { companyName: true, user: { select: { email: true } } } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({ properties, total, page, pages: Math.ceil(total / limit) });
}
