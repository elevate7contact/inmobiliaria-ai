// src/lib/anthropic.ts
// Cliente singleton de Anthropic + helper extractSearchCriteria.
// Convierte queries en lenguaje natural ("apto 2 cuartos en Bogotá menos de 500K")
// en un JSON estructurado de criterios de búsqueda, usando pre-fill assistant con `{`.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

if (!process.env.ANTHROPIC_API_KEY) {
  // No tirar en import-time durante build; warning para runtime.
  if (process.env.NODE_ENV !== "production") {
    console.warn("[anthropic] ANTHROPIC_API_KEY no definida");
  }
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

const MODEL = "claude-sonnet-4-5";

export type ExtractedCriteria = {
  countryId: string;
  cityName?: string;
  cityId?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  type?: "APARTMENT" | "HOUSE" | "LAND" | "OFFICE" | "COMMERCIAL";
  services?: string[];
};

export type ExtractResult =
  | { ok: true; criteria: ExtractedCriteria }
  | { ok: false; error: string; needsClarification?: boolean; suggestions?: string[] };

const SYSTEM_PROMPT = `Sos un parser de búsquedas inmobiliarias. Recibís un query del usuario en español y devolvés EXCLUSIVAMENTE un JSON válido con los criterios extraídos.

Schema esperado:
{
  "cityName": string | null,             // nombre de la ciudad mencionada, ej "Bogotá"
  "budgetMin": number | null,            // presupuesto mínimo en moneda local
  "budgetMax": number | null,            // presupuesto máximo en moneda local
  "bedrooms": number | null,             // habitaciones mínimas
  "bathrooms": number | null,            // baños mínimos
  "type": "APARTMENT" | "HOUSE" | "LAND" | "OFFICE" | "COMMERCIAL" | null,
  "services": string[] | null,           // ["pool", "gym", "parking", "security", "balcony", "pet-friendly"]
  "ambiguous": boolean,                  // true si el query es muy vago
  "suggestions": string[] | null         // si ambiguous=true, 3 preguntas para clarificar
}

Reglas:
- Si dicen "apto", "apartamento", "depto" → APARTMENT
- Si dicen "casa" → HOUSE
- Si dicen "lote", "terreno" → LAND
- Si dicen "oficina" → OFFICE
- Si dicen "local", "comercial" → COMMERCIAL
- "menos de 500K" / "500 millones" → budgetMax con número expandido (500000000 para COP, 500000 para USD según contexto)
- Si el query es solo "busco algo" o muy vago → ambiguous=true con 3 sugerencias concretas
- NO inventes datos. Si no se menciona, usá null.
- Devolvé SOLO el JSON, sin texto adicional, sin markdown.`;

/**
 * Extrae criterios estructurados de un query natural.
 * Resuelve cityName → cityId haciendo lookup en DB por countryId.
 */
export async function extractSearchCriteria(
  userQuery: string,
  countryCode: string
): Promise<ExtractResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY no configurada" };
  }

  // Resolver countryId desde code
  const country = await prisma.country.findUnique({
    where: { code: countryCode },
    select: { id: true },
  });
  if (!country) {
    return { ok: false, error: `País no encontrado: ${countryCode}` };
  }

  let raw = "";
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userQuery },
        // Pre-fill assistant con "{" para forzar JSON inmediato
        { role: "assistant", content: "{" },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      return { ok: false, error: "Respuesta inesperada de Claude" };
    }
    // El pre-fill no se incluye en la respuesta; lo prependemos.
    raw = "{" + block.text;
  } catch (err) {
    console.error("[anthropic] error invocando Claude:", err);
    return { ok: false, error: "Error invocando IA" };
  }

  type ParsedResponse = {
    cityName?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    type?: ExtractedCriteria["type"] | null;
    services?: string[] | null;
    ambiguous?: boolean;
    suggestions?: string[] | null;
  };

  let parsed: ParsedResponse;
  try {
    // A veces Claude devuelve algo extra después del JSON; recortamos al primer cierre balanceado.
    const trimmed = raw.trim();
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      error: "no entendí, reformulá",
    };
  }

  if (parsed.ambiguous) {
    return {
      ok: false,
      error: "Query ambiguo",
      needsClarification: true,
      suggestions: parsed.suggestions ?? [
        "¿En qué ciudad estás buscando?",
        "¿Cuál es tu presupuesto aproximado?",
        "¿Cuántas habitaciones necesitás?",
      ],
    };
  }

  // Resolver cityId si tenemos cityName
  let cityId: string | undefined;
  if (parsed.cityName) {
    const city = await prisma.city.findFirst({
      where: {
        countryId: country.id,
        name: { equals: parsed.cityName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (city) cityId = city.id;
  }

  return {
    ok: true,
    criteria: {
      countryId: country.id,
      cityName: parsed.cityName ?? undefined,
      cityId,
      budgetMin: parsed.budgetMin ?? undefined,
      budgetMax: parsed.budgetMax ?? undefined,
      bedrooms: parsed.bedrooms ?? undefined,
      bathrooms: parsed.bathrooms ?? undefined,
      type: parsed.type ?? undefined,
      services: parsed.services ?? undefined,
    },
  };
}
