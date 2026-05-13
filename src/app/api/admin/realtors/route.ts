import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_VERIFICATION = ["PENDING", "VERIFIED", "REJECTED"] as const;

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
    const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = 20;

    // Validar verificationStatus si se pasa
    const verificationStatus =
      statusRaw && (VALID_VERIFICATION as readonly string[]).includes(statusRaw)
        ? statusRaw
        : undefined;

    const where = verificationStatus ? { verificationStatus } : {};

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
  } catch (err) {
    console.error("GET /api/admin/realtors error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
