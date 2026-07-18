-- Single Portal User ID architecture: replace buyer/seller marketplace IDs.

-- Step 1: Add portal_user_id column
ALTER TABLE "users" ADD COLUMN "portal_user_id" VARCHAR(32);

-- Step 2: Backfill one portal ID per user (stable order by account creation)
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC, "id" ASC) AS rn
  FROM "users"
)
UPDATE "users" AS u
SET "portal_user_id" = 'USR-DEMO-' || LPAD(n.rn::text, 6, '0')
FROM numbered AS n
WHERE u."id" = n."id"
  AND u."portal_user_id" IS NULL;

-- Step 3: Enforce uniqueness
CREATE UNIQUE INDEX "users_portal_user_id_key" ON "users"("portal_user_id");

-- Step 4: Drop legacy marketplace identity columns and counter table
ALTER TABLE "users" DROP COLUMN IF EXISTS "buyer_marketplace_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "seller_marketplace_id";
DROP TABLE IF EXISTS "marketplace_id_counters";
