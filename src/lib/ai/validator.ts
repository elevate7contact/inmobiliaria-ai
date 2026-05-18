// src/lib/ai/validator.ts
// Validador post-respuesta del asistente. NO bloquea — solo logea drift.
// Detecta IDs de propiedad fantasma y menciones de precio/m² sin respaldo
// de tools (propiedades citadas).

export type ValidationResult = {
  ok: boolean;
  issues: string[];
};

// cuid: empieza en 'c', luego 20-30 chars alfanuméricos lowercase.
const CUID_RE = /\bc[a-z0-9]{20,30}\b/g;
// Precios: $1.500.000 / $ 200 / 1.5 M / 200 millones / 250000 USD / 800000 COP
const PRICE_RE = /(\$\s*[\d.,]+|[\d.,]+\s*(?:M|millones?|USD|COP)\b)/gi;
// Metros cuadrados: 80 m² / 120m2
const SQM_RE = /\b\d+\s*m(?:²|2)\b/gi;

/**
 * Revisa el texto final del assistant contra los propertyIds que sí vinieron
 * de tools. Si encuentra inconsistencias, las logea con tag [vistaagent-validator].
 */
export async function validateAssistantResponse(
  text: string,
  citedPropertyIds: string[],
  conversationId: string,
  messageId: string
): Promise<ValidationResult> {
  const issues: string[] = [];
  const citedSet = new Set(citedPropertyIds);

  // 1. IDs fantasma: cualquier cuid en el texto que no fue citado por tool.
  const cuidMatches = text.match(CUID_RE) ?? [];
  for (const id of cuidMatches) {
    if (!citedSet.has(id)) {
      issues.push(`phantom_id:${id}`);
    }
  }

  // 2. Precios sin respaldo: si menciona precios pero no citó ninguna propiedad.
  const hasPrice = PRICE_RE.test(text);
  if (hasPrice && citedPropertyIds.length === 0) {
    issues.push("price_without_property_citation");
  }

  // 3. m² sin respaldo: mismo criterio.
  const hasSqm = SQM_RE.test(text);
  if (hasSqm && citedPropertyIds.length === 0) {
    issues.push("sqm_without_property_citation");
  }

  if (issues.length > 0) {
    console.warn(
      "[vistaagent-validator] drift detectado",
      JSON.stringify({ conversationId, messageId, issues })
    );
  }

  return { ok: issues.length === 0, issues };
}
