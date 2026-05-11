// src/app/api/properties/[id]/photos/route.ts
// POST: recibe multipart/form-data con uno o más files bajo el campo "photos".
//       Sube cada archivo a Supabase Storage (bucket "property-photos"), hace append a Property.photoUrls.
//       Máx 6 fotos totales por property (incluyendo las ya guardadas).
// DELETE: body JSON { photoUrl } — saca esa URL del array y borra el objeto del bucket.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const BUCKET = "property-photos";
const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function publicUrlToPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

async function requireOwner(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) {
    return {
      error: NextResponse.json(
        { error: "Solo inmobiliarias pueden gestionar fotos" },
        { status: 403 }
      ),
    };
  }

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, realtorId: true, photoUrls: true },
  });
  if (!property) {
    return {
      error: NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 }),
    };
  }
  if (property.realtorId !== realtor.id) {
    return {
      error: NextResponse.json(
        { error: "No tenés permiso sobre esta propiedad" },
        { status: 403 }
      ),
    };
  }
  return { supabase, user, realtor, property };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOwner(id);
    if ("error" in auth) return auth.error;
    const { supabase, realtor, property } = auth;

    const formData = await request.formData();
    const files = formData.getAll("photos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No se enviaron fotos" }, { status: 400 });
    }

    const current = property.photoUrls ?? [];
    if (current.length + files.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Máx ${MAX_PHOTOS} fotos por propiedad (tenés ${current.length}).` },
        { status: 400 }
      );
    }

    const newUrls: string[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo no permitido: ${file.type}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `Foto "${file.name}" excede 5MB` },
          { status: 400 }
        );
      }
      const path = `${realtor.id}/${id}/${Date.now()}-${sanitizeFilename(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (error) {
        console.error("Storage upload error:", error);
        return NextResponse.json(
          { error: `Error subiendo "${file.name}": ${error.message}` },
          { status: 500 }
        );
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { photoUrls: [...current, ...newUrls] },
      select: { id: true, photoUrls: true },
    });

    return NextResponse.json({ property: updated, added: newUrls }, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties/[id]/photos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOwner(id);
    if ("error" in auth) return auth.error;
    const { supabase, property } = auth;

    const body = (await request.json().catch(() => ({}))) as { photoUrl?: string };
    const photoUrl = body.photoUrl;
    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json({ error: "photoUrl requerido" }, { status: 400 });
    }

    const current = property.photoUrls ?? [];
    if (!current.includes(photoUrl)) {
      return NextResponse.json(
        { error: "Esa foto no pertenece a esta propiedad" },
        { status: 404 }
      );
    }

    const path = publicUrlToPath(photoUrl);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const next = current.filter((u) => u !== photoUrl);
    const updated = await prisma.property.update({
      where: { id },
      data: { photoUrls: next },
      select: { id: true, photoUrls: true },
    });

    return NextResponse.json({ property: updated });
  } catch (err) {
    console.error("DELETE /api/properties/[id]/photos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
