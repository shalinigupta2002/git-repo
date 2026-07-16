-- RFQ production hardening: RfqGroup registry, unique rfqNumber, unique group+seller

-- Ensure counter table exists (Phase 2A)
CREATE TABLE IF NOT EXISTS "rfq_number_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rfq_number_counters_pkey" PRIMARY KEY ("year")
);

-- Group registry with globally unique rfq_number
CREATE TABLE IF NOT EXISTS "rfq_groups" (
    "id" UUID NOT NULL,
    "rfq_number" VARCHAR(32) NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rfq_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfq_groups_rfq_number_key" ON "rfq_groups"("rfq_number");
CREATE INDEX IF NOT EXISTS "rfq_groups_buyer_id_idx" ON "rfq_groups"("buyer_id");
CREATE INDEX IF NOT EXISTS "rfq_groups_created_at_idx" ON "rfq_groups"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rfq_groups_buyer_id_fkey'
  ) THEN
    ALTER TABLE "rfq_groups"
      ADD CONSTRAINT "rfq_groups_buyer_id_fkey"
      FOREIGN KEY ("buyer_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill groups from existing multi-row RFQ submissions
INSERT INTO "rfq_groups" ("id", "rfq_number", "buyer_id", "created_at")
SELECT
  qr.rfq_group_id,
  COALESCE(MAX(qr.rfq_number), 'RFQ-LEGACY-' || SUBSTRING(qr.rfq_group_id::text, 1, 8)),
  MIN(qr.buyer_id),
  MIN(qr.created_at)
FROM "quote_requests" qr
WHERE qr.rfq_group_id IS NOT NULL
GROUP BY qr.rfq_group_id
ON CONFLICT ("id") DO NOTHING;

-- Legacy standalone rows become single-row groups
INSERT INTO "rfq_groups" ("id", "rfq_number", "buyer_id", "created_at")
SELECT
  qr.id::uuid,
  COALESCE(qr.rfq_number, 'RFQ-LEGACY-' || SUBSTRING(qr.id, 1, 8)),
  qr.buyer_id,
  qr.created_at
FROM "quote_requests" qr
WHERE qr.rfq_group_id IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "quote_requests"
SET "rfq_group_id" = "id"::uuid
WHERE "rfq_group_id" IS NULL;

-- Link quote requests to group registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_requests_rfq_group_id_fkey'
  ) THEN
    ALTER TABLE "quote_requests"
      ADD CONSTRAINT "quote_requests_rfq_group_id_fkey"
      FOREIGN KEY ("rfq_group_id") REFERENCES "rfq_groups"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Prevent duplicate seller per RFQ group (non-null sellers only)
CREATE UNIQUE INDEX IF NOT EXISTS "quote_requests_rfq_group_id_seller_id_key"
  ON "quote_requests"("rfq_group_id", "seller_id")
  WHERE "seller_id" IS NOT NULL;

-- Composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS "quote_requests_buyer_id_status_idx"
  ON "quote_requests"("buyer_id", "status");

CREATE INDEX IF NOT EXISTS "quote_requests_seller_id_status_idx"
  ON "quote_requests"("seller_id", "status");
