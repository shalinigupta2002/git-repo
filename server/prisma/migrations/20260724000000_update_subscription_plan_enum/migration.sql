-- Rename the old enum to old type
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";

-- Create the new enum with exactly the 9 finalized values
CREATE TYPE "SubscriptionPlan" AS ENUM (
  'BUYER_MONTHLY',
  'BUYER_ANNUAL',
  'BUYER_LIFETIME',
  'SELLER_MONTHLY',
  'SELLER_ANNUAL',
  'SELLER_LIFETIME',
  'BOTH_MONTHLY',
  'BOTH_ANNUAL',
  'BOTH_LIFETIME'
);

-- Update user fields to cast to new type
ALTER TABLE "users" ALTER COLUMN "buyer_subscription_plan" TYPE "SubscriptionPlan" USING "buyer_subscription_plan"::text::"SubscriptionPlan";
ALTER TABLE "users" ALTER COLUMN "seller_subscription_plan" TYPE "SubscriptionPlan" USING "seller_subscription_plan"::text::"SubscriptionPlan";

-- Update subscription plan to cast to new type
ALTER TABLE "subscriptions" ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING "plan"::text::"SubscriptionPlan";

-- Update payments plan to cast to new type
ALTER TABLE "payments" ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING "plan"::text::"SubscriptionPlan";

-- Drop the old enum type
DROP TYPE "SubscriptionPlan_old";
