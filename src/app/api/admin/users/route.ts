import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["SEARCHER", "REALTOR", "ADMIN"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const roleRaw = searchParams.get("role") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = 20;

    // Validar role si se pasa
    const role =
      roleRaw && (VALID_ROLES as readonly string[]).includes(roleRaw)
        ? (roleRaw as (typeof VALID_ROLES)[number])
        : undefined;

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
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
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
