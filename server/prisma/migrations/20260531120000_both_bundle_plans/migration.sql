-- Add combined "both" bundle values to SubscriptionPlan (single Razorpay checkout)
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BOTH_STANDARD_MONTH';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BOTH_LIFETIME_LIFETIME';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BOTH_LIFETIME_MONTH';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BOTH_STANDARD_LIFETIME';
