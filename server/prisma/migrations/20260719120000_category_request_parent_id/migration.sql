-- Store stable parent category reference for subcategory requests
ALTER TABLE "category_requests"
ADD COLUMN IF NOT EXISTS "parent_category_id" INTEGER;
