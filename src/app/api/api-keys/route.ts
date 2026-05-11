import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — listar API keys del usuario (sin mostrar el hash)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const keys = await prisma.aPIKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      active: true,
      lastUsed: true,
      createdAt: true,
    },
  });

  return NextResponse.json(keys);
}

// POST — crear una nueva API key
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 });
  }

  // Máximo 5 keys activas por usuario
  const count = await prisma.aPIKey.count({ where: { userId: user.id, active: true } });
  if (count >= 5) {
    return NextResponse.json({ error: "Máximo 5 API keys activas. Revoca alguna primero." }, { status: 400 });
  }

  const { plain, hash } = generateApiKey();

  await prisma.aPIKey.create({
    data: { userId: user.id, name: name.trim(), key: hash },
  });

  // Retornar la clave en texto plano UNA SOLA VEZ
  return NextResponse.json({ plain }, { status: 201 });
}
