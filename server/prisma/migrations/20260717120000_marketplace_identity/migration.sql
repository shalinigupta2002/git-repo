-- Marketplace identity fields on users (nullable until subscription activates)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "buyer_marketplace_id" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "buyer_subscription_status" "SubscriptionStatus";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "buyer_subscription_plan" "SubscriptionPlan";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "buyer_subscription_activated_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_marketplace_id" VARCHAR(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_subscription_status" "SubscriptionStatus";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_subscription_plan" "SubscriptionPlan";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_subscription_activated_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "users_buyer_marketplace_id_key" ON "users"("buyer_marketplace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_seller_marketplace_id_key" ON "users"("seller_marketplace_id");
