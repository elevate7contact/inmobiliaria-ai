import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SOLD"] as const;

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
    const statusRaw = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = 20;

    // Validar status si se pasa
    const status =
      statusRaw && (VALID_STATUSES as readonly string[]).includes(statusRaw)
        ? (statusRaw as (typeof VALID_STATUSES)[number])
        : undefined;

    const where = {
      ...(status ? { status } : {}),
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
  } catch (err) {
    console.error("GET /api/admin/properties error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
