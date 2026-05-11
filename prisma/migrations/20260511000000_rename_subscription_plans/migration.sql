-- Rename SubscriptionPlan enum values:
--   PLAN_20  → STARTER
--   PLAN_50  → GROWTH
--   PLAN_100 → EMPIRE
--
-- Postgres soporta ALTER TYPE ... RENAME VALUE desde 10.x. No requiere reescribir
-- las filas existentes; el cambio es solo en el catálogo del tipo enumerado.

ALTER TYPE "SubscriptionPlan" RENAME VALUE 'PLAN_20' TO 'STARTER';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'PLAN_50' TO 'GROWTH';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'PLAN_100' TO 'EMPIRE';

-- Asegurar que el default de la columna Subscription.plan apunte al nuevo nombre.
-- Postgres mantiene el OID al renombrar enum values, pero por explicitez fijamos
-- el default con el literal nuevo para que pg_dump y futuras migraciones queden claras.
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'STARTER'::"SubscriptionPlan";
