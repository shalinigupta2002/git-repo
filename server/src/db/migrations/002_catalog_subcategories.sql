-- =============================================================
-- Migration 002: Add subcategory support to catalog.categories
-- Adds a self-referential parent_id column so a category can
-- be a child (subcategory) of another category.
-- =============================================================

ALTER TABLE catalog.categories
  ADD COLUMN IF NOT EXISTS parent_id INTEGER
    REFERENCES catalog.categories(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent_id
  ON catalog.categories (parent_id);
