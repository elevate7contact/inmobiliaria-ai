import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["APARTMENT", "HOUSE", "LAND", "OFFICE", "COMMERCIAL"];
const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SOLD"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    // Parse respetando campos entre comillas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = user.user_metadata?.role ?? "SEARCHER";
  if (role !== "REALTOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Solo realtors pueden importar" }, { status: 403 });
  }

  const realtor = await prisma.realtorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!realtor) return NextResponse.json({ error: "Perfil de realtor no encontrado" }, { status: 404 });

  // Leer el archivo CSV del body
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: "CSV vacío o sin filas" }, { status: 400 });

  // Cargar países y ciudades para lookup
  const countries = await prisma.country.findMany({ include: { cities: true } });
  const countryMap = Object.fromEntries(countries.map((c) => [c.code.toUpperCase(), c]));

  const results = { created: 0, errors: [] as { row: number; reason: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +2 porque row 1 es el header

    try {
      // Validar campos requeridos
      if (!r.titulo) throw new Error("titulo requerido");
      if (!r.tipo || !VALID_TYPES.includes(r.tipo.toUpperCase())) {
        throw new Error(`tipo inválido: "${r.tipo}". Válidos: ${VALID_TYPES.join(", ")}`);
      }
      if (!r.precio || isNaN(Number(r.precio))) throw new Error("precio inválido");
      if (!r.moneda) throw new Error("moneda requerida");
      if (!r.pais_codigo) throw new Error("pais_codigo requerido");

      const country = countryMap[r.pais_codigo.toUpperCase()];
      if (!country) throw new Error(`país no encontrado: "${r.pais_codigo}"`);

      const city = country.cities.find(
        (c) => c.name.toLowerCase() === (r.ciudad ?? "").toLowerCase()
      );
      if (!city) throw new Error(`ciudad no encontrada: "${r.ciudad}" en ${country.name}`);

      const status = r.estado
        ? (VALID_STATUSES.includes(r.estado.toUpperCase()) ? r.estado.toUpperCase() : "ACTIVE")
        : "ACTIVE";

      await prisma.property.create({
        data: {
          realtorId: realtor.id,
          countryId: country.id,
          cityId: city.id,
          title: r.titulo,
          description: r.descripcion ?? r.titulo,
          price: Number(r.precio),
          currency: r.moneda.toUpperCase(),
          type: r.tipo.toUpperCase() as "APARTMENT" | "HOUSE" | "LAND" | "OFFICE" | "COMMERCIAL",
          bedrooms: Number(r.habitaciones ?? 0),
          bathrooms: Number(r.banos ?? 0),
          areaM2: Number(r.area_m2 ?? 1),
          floor: r.piso ? Number(r.piso) : null,
          yearBuilt: r.anio_construccion ? Number(r.anio_construccion) : null,
          services: r.servicios ? r.servicios.split("|").map((s) => s.trim()).filter(Boolean) : [],
          directLink: r.enlace_directo || null,
          status: status as "ACTIVE" | "INACTIVE" | "SOLD",
        },
      });

      results.created++;
    } catch (e) {
      results.errors.push({
        row: rowNum,
        reason: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json(results);
}
