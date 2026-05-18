// src/lib/ai/knowledge-base.ts
// Carga los 7 documentos markdown de knowledge-base/ y los concatena.
// Server-only. Cacheado en memoria al primer load.
// Estructurado para aprovechar prompt caching de Anthropic.

import { readFileSync } from "fs";
import { join } from "path";

const KB_DIR = join(process.cwd(), "knowledge-base");

const FILES = [
  "01-product-overview.md",
  "02-pricing-and-access.md",
  "03-faq-buyers.md",
  "04-agent-guardrails.md",
  "05-features-glossary.md",
  "06-process-and-trust.md",
  "07-conversation-examples.md",
] as const;

let cached: string | null = null;

export function getKnowledgeBase(): string {
  if (cached !== null) return cached;
  const parts: string[] = [];
  for (const file of FILES) {
    try {
      const content = readFileSync(join(KB_DIR, file), "utf-8");
      parts.push(content);
    } catch (err) {
      console.warn(`[kb] no se pudo leer ${file}:`, err);
    }
  }
  cached = parts.join("\n\n---\n\n");
  return cached;
}
