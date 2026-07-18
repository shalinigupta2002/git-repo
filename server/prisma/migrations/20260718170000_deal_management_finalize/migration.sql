-- Finalize Deal Management schema per Marketplace business rules.
-- Payment SSOT: deal_payments. Contact unlock on deals only. Flexible planKey charge configs.

-- ── 1. Remove deal_contact_unlocks ──────────────────────────────────────────
DROP TABLE IF EXISTS "deal_contact_unlocks";

-- ── 2. Simplify DealStatus enum (remove payment/unlock sub-states) ───────────
UPDATE "deals" SET "status" = 'PAYMENT_PENDING'
WHERE "status"::text IN ('BUYER_PAID', 'SELLER_PAID', 'CONTACT_UNLOCKED');

ALTER TYPE "DealStatus" RENAME TO "DealStatus_old";

CREATE TYPE "DealStatus" AS ENUM (
  'QUOTATION_ACCEPTED',
  'DEAL_CREATED',
  'PAYMENT_PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED'
);

ALTER TABLE "deals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "deals" ALTER COLUMN "status" TYPE "DealStatus"
  USING ("status"::text::"DealStatus");
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'DEAL_CREATED';

DROP TYPE "DealStatus_old";

-- ── 3. deals — remove duplicate payment columns; expand product snapshot ───────
ALTER TABLE "deals" DROP COLUMN IF EXISTS "buyer_payment_status";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "seller_payment_status";

ALTER TABLE "deals" RENAME COLUMN "product_title" TO "product_name";

ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "product_sku" VARCHAR(64);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "product_brand" VARCHAR(200);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "product_category" VARCHAR(200);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "product_uom" VARCHAR(32);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "product_moq" INTEGER;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "vendor_product_code" VARCHAR(64);

ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "buyer_charge_config_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "seller_charge_config_id" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "contact_unlock_override" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "disputed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "deals_contact_unlock_status_idx" ON "deals"("contact_unlock_status");

ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_charge_config_id_fkey"
  FOREIGN KEY ("buyer_charge_config_id") REFERENCES "deal_charge_configs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_charge_config_id_fkey"
  FOREIGN KEY ("seller_charge_config_id") REFERENCES "deal_charge_configs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. deal_charge_configs — flexible subscription plan keys ─────────────────
ALTER TABLE "deal_charge_configs" ADD COLUMN IF NOT EXISTS "plan_key" VARCHAR(64);
ALTER TABLE "deal_charge_configs" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(120);

UPDATE "deal_charge_configs" SET "plan_key" = CASE
  WHEN "audience" = 'BUYER' AND "plan_tier" = 'LIFETIME' THEN 'BUYER_LIFETIME'
  WHEN "audience" = 'BUYER' AND "plan_tier" = 'ANNUAL' THEN 'BUYER_STANDARD'
  WHEN "audience" = 'SELLER' AND "plan_tier" = 'LIFETIME' THEN 'SELLER_LIFETIME'
  WHEN "audience" = 'SELLER' AND "plan_tier" = 'ANNUAL' THEN 'SELLER_MONTH'
  ELSE 'UNKNOWN'
END
WHERE "plan_key" IS NULL;

UPDATE "deal_charge_configs" SET "display_name" = CASE
  WHEN "plan_key" = 'BUYER_LIFETIME' THEN 'Buyer Lifetime'
  WHEN "plan_key" = 'BUYER_STANDARD' THEN 'Buyer Standard'
  WHEN "plan_key" = 'SELLER_LIFETIME' THEN 'Seller Lifetime'
  WHEN "plan_key" = 'SELLER_MONTH' THEN 'Seller Monthly'
  ELSE "plan_key"
END
WHERE "display_name" IS NULL;

ALTER TABLE "deal_charge_configs" ALTER COLUMN "plan_key" SET NOT NULL;

DROP INDEX IF EXISTS "deal_charge_configs_audience_plan_tier_key";
ALTER TABLE "deal_charge_configs" DROP COLUMN IF EXISTS "plan_tier";

CREATE UNIQUE INDEX IF NOT EXISTS "deal_charge_configs_audience_plan_key_key"
  ON "deal_charge_configs"("audience", "plan_key");
CREATE INDEX IF NOT EXISTS "deal_charge_configs_is_active_idx"
  ON "deal_charge_configs"("is_active");

DROP TYPE IF EXISTS "DealChargePlanTier";

-- Seed bundle / future-friendly configs (idempotent via upsert pattern)
INSERT INTO "deal_charge_configs" ("id", "audience", "plan_key", "display_name", "charge_type", "value", "currency", "is_active", "updated_at")
SELECT gen_random_uuid()::text, v.audience::"DealChargeAudience", v.plan_key, v.display_name, 'PERCENTAGE'::"DealChargeType", v.value, 'INR', true, CURRENT_TIMESTAMP
FROM (VALUES
  ('BUYER', 'BOTH_LIFETIME_LIFETIME', 'Both Lifetime Bundle (Buyer)', 1.5000),
  ('BUYER', 'BOTH_LIFETIME_MONTH', 'Both Lifetime + Seller Month (Buyer)', 1.7500),
  ('BUYER', 'BOTH_STANDARD_LIFETIME', 'Both Standard + Seller Lifetime (Buyer)', 2.0000),
  ('BUYER', 'BOTH_STANDARD_MONTH', 'Both Standard + Seller Month (Buyer)', 2.0000),
  ('SELLER', 'BOTH_LIFETIME_LIFETIME', 'Both Lifetime Bundle (Seller)', 1.5000),
  ('SELLER', 'BOTH_LIFETIME_MONTH', 'Both Lifetime + Seller Month (Seller)', 1.7500),
  ('SELLER', 'BOTH_STANDARD_LIFETIME', 'Both Standard + Seller Lifetime (Seller)', 2.0000),
  ('SELLER', 'BOTH_STANDARD_MONTH', 'Both Standard + Seller Month (Seller)', 2.0000)
) AS v(audience, plan_key, display_name, value)
WHERE NOT EXISTS (
  SELECT 1 FROM "deal_charge_configs" c
  WHERE c."audience" = v.audience::"DealChargeAudience" AND c."plan_key" = v.plan_key
);

-- ── 5. deal_payments — gateway-ready SSOT ────────────────────────────────────
ALTER TABLE "deal_payments" RENAME COLUMN "status" TO "payment_status";
ALTER TABLE "deal_payments" RENAME COLUMN "external_reference" TO "payment_reference";

ALTER TABLE "deal_payments" ADD COLUMN IF NOT EXISTS "provider_order_id" VARCHAR(128);
ALTER TABLE "deal_payments" ADD COLUMN IF NOT EXISTS "provider_payment_id" VARCHAR(128);
ALTER TABLE "deal_payments" ADD COLUMN IF NOT EXISTS "provider_signature" VARCHAR(512);

UPDATE "deal_payments"
SET "payment_reference" = 'DPAY-' || LEFT(REPLACE("id", '-', ''), 24)
WHERE "payment_reference" IS NULL;

ALTER TABLE "deal_payments" ALTER COLUMN "payment_reference" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "deal_payments_payment_reference_key"
  ON "deal_payments"("payment_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "deal_payments_deal_id_payer_role_key"
  ON "deal_payments"("deal_id", "payer_role");
CREATE INDEX IF NOT EXISTS "deal_payments_payment_status_idx"
  ON "deal_payments"("payment_status");
CREATE INDEX IF NOT EXISTS "deal_payments_provider_provider_payment_id_idx"
  ON "deal_payments"("provider", "provider_payment_id");

DROP INDEX IF EXISTS "deal_payments_status_idx";
DROP INDEX IF EXISTS "deal_payments_deal_id_payer_role_idx";

-- ── 6. deal_events — append-only audit trail ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "deal_events" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "deal_events_deal_id_created_at_idx"
  ON "deal_events"("deal_id", "created_at");
CREATE INDEX IF NOT EXISTS "deal_events_event_type_idx"
  ON "deal_events"("event_type");

ALTER TABLE "deal_events" DROP CONSTRAINT IF EXISTS "deal_events_deal_id_fkey";
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_deal_id_fkey"
  FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_events" DROP CONSTRAINT IF EXISTS "deal_events_actor_id_fkey";
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
