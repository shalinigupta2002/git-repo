-- Deal Management Module (Phase 1) — schema only, no data backfill.

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM (
  'QUOTATION_ACCEPTED',
  'DEAL_CREATED',
  'PAYMENT_PENDING',
  'BUYER_PAID',
  'SELLER_PAID',
  'CONTACT_UNLOCKED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED'
);

CREATE TYPE "DealPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TYPE "DealChargeAudience" AS ENUM ('BUYER', 'SELLER');

CREATE TYPE "DealChargePlanTier" AS ENUM ('LIFETIME', 'ANNUAL');

CREATE TYPE "DealChargeType" AS ENUM ('PERCENTAGE', 'FLAT');

CREATE TYPE "ContactUnlockStatus" AS ENUM ('LOCKED', 'UNLOCKED');

-- CreateTable
CREATE TABLE "deal_number_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "deal_number_counters_pkey" PRIMARY KEY ("year")
);

CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "deal_number" VARCHAR(32) NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "rfq_group_id" UUID,
    "order_id" TEXT,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_title" VARCHAR(300) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "DealStatus" NOT NULL DEFAULT 'DEAL_CREATED',
    "buyer_payment_status" "DealPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "seller_payment_status" "DealPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "buyer_deal_charge" DECIMAL(12,2),
    "seller_deal_charge" DECIMAL(12,2),
    "contact_unlock_status" "ContactUnlockStatus" NOT NULL DEFAULT 'LOCKED',
    "contact_unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_charge_configs" (
    "id" TEXT NOT NULL,
    "audience" "DealChargeAudience" NOT NULL,
    "plan_tier" "DealChargePlanTier" NOT NULL,
    "charge_type" "DealChargeType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_charge_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_payments" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "payer_role" "DealChargeAudience" NOT NULL,
    "payer_user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "DealPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(32) NOT NULL DEFAULT 'dummy',
    "external_reference" VARCHAR(128),
    "paid_at" TIMESTAMP(3),
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_contact_unlocks" (
    "deal_id" TEXT NOT NULL,
    "status" "ContactUnlockStatus" NOT NULL DEFAULT 'LOCKED',
    "unlocked_at" TIMESTAMP(3),
    "buyer_snapshot" JSONB,
    "seller_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_contact_unlocks_pkey" PRIMARY KEY ("deal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deals_deal_number_key" ON "deals"("deal_number");
CREATE UNIQUE INDEX "deals_quote_request_id_key" ON "deals"("quote_request_id");
CREATE UNIQUE INDEX "deals_order_id_key" ON "deals"("order_id");
CREATE INDEX "deals_buyer_id_idx" ON "deals"("buyer_id");
CREATE INDEX "deals_seller_id_idx" ON "deals"("seller_id");
CREATE INDEX "deals_status_idx" ON "deals"("status");
CREATE INDEX "deals_rfq_group_id_idx" ON "deals"("rfq_group_id");
CREATE INDEX "deals_created_at_idx" ON "deals"("created_at");
CREATE INDEX "deals_buyer_id_status_idx" ON "deals"("buyer_id", "status");
CREATE INDEX "deals_seller_id_status_idx" ON "deals"("seller_id", "status");

CREATE UNIQUE INDEX "deal_charge_configs_audience_plan_tier_key" ON "deal_charge_configs"("audience", "plan_tier");

CREATE INDEX "deal_payments_deal_id_idx" ON "deal_payments"("deal_id");
CREATE INDEX "deal_payments_payer_user_id_idx" ON "deal_payments"("payer_user_id");
CREATE INDEX "deal_payments_deal_id_payer_role_idx" ON "deal_payments"("deal_id", "payer_role");
CREATE INDEX "deal_payments_status_idx" ON "deal_payments"("status");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_rfq_group_id_fkey" FOREIGN KEY ("rfq_group_id") REFERENCES "rfq_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_charge_configs" ADD CONSTRAINT "deal_charge_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_payments" ADD CONSTRAINT "deal_payments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_payments" ADD CONSTRAINT "deal_payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_contact_unlocks" ADD CONSTRAINT "deal_contact_unlocks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default admin charge configs (percentage; admin can override via CRUD in later phases)
INSERT INTO "deal_charge_configs" ("id", "audience", "plan_tier", "charge_type", "value", "currency", "is_active", "updated_at")
VALUES
  (gen_random_uuid()::text, 'BUYER', 'LIFETIME', 'PERCENTAGE', 1.5000, 'INR', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'BUYER', 'ANNUAL', 'PERCENTAGE', 2.0000, 'INR', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SELLER', 'LIFETIME', 'PERCENTAGE', 1.5000, 'INR', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SELLER', 'ANNUAL', 'PERCENTAGE', 2.0000, 'INR', true, CURRENT_TIMESTAMP);
