// src/app/api/admin/users/[id]/route.ts
// PATCH: cambia el rol en Prisma Y en Supabase user_metadata (fuente de verdad para auth).
// DELETE: elimina de Prisma Y de Supabase Auth (impide que el usuario vuelva a loguearse).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["SEARCHER", "REALTOR", "ADMIN"] as const;
type Role = (typeof VALID_ROLES)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.user_metadata?.role ?? "SEARCHER") !== "ADMIN") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: string };

  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  // Prevenir que el admin se quite sus propios privilegios
  const dbAdmin = await prisma.user.findFirst({
    where: { email: admin.email! },
    select: { id: true },
  });
  if (dbAdmin?.id === id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "No puedes quitarte el rol de ADMIN a ti mismo" },
      { status: 400 }
    );
  }

  // 1. Actualizar rol en Prisma
  const updated = await prisma.user.update({
    where: { id },
    data: { role: role as Role },
    select: { id: true, email: true, role: true },
  });

  // 2. Sincronizar rol en Supabase user_metadata (fuente de verdad para auth/proxy)
  //    Buscamos al usuario de Supabase por email para obtener su UUID.
  try {
    const adminClient = createAdminClient();
    const { data: listData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const supabaseUser = listData?.users.find((u) => u.email === updated.email);
    if (supabaseUser) {
      await adminClient.auth.admin.updateUserById(supabaseUser.id, {
        user_metadata: { ...supabaseUser.user_metadata, role },
      });
    }
  } catch (err) {
    // No hacer rollback del cambio en Prisma — loguear el fallo de Supabase
    console.error("admin PATCH: error sincronizando Supabase metadata:", err);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;

  // Obtener datos del usuario a eliminar
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Prevenir auto-eliminación
  if (targetUser.email === admin.email) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  // 1. Eliminar de Prisma (cascade elimina subscription, realtor profile, etc.)
  await prisma.user.delete({ where: { id } });

  // 2. Eliminar de Supabase Auth para que no pueda volver a loguearse
  try {
    const adminClient = createAdminClient();
    const { data: listData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const supabaseUser = listData?.users.find((u) => u.email === targetUser.email);
    if (supabaseUser) {
      await adminClient.auth.admin.deleteUser(supabaseUser.id);
    }
  } catch (err) {
    // El usuario ya fue borrado de Prisma. Loguear el fallo de Supabase.
    console.error("admin DELETE: error eliminando usuario de Supabase Auth:", err);
  }

  return NextResponse.json({ ok: true });
}
