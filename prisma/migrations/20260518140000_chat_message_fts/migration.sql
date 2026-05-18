-- Sprint 4 · Recall semántico via Postgres full-text search.
-- Columna generada tsvector + índice GIN sobre ChatMessage.content.
-- Invisible para Prisma — usable solo via $queryRaw.

-- Columna tsvector generada automáticamente desde content en español.
ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', "content")) STORED;

-- Índice GIN para búsqueda rápida.
CREATE INDEX IF NOT EXISTS "ChatMessage_searchVector_idx"
  ON "ChatMessage" USING GIN ("searchVector");
