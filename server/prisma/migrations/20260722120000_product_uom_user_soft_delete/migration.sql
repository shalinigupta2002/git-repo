-- Additive only: product UOM column + user soft-deactivation fields.
-- Does not modify or delete existing business records.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "uom" VARCHAR(16);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMP(3);
