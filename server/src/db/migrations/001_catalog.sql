-- =============================================================
-- Catalog module schema
-- Isolated under its own PostgreSQL schema "catalog" so it does
-- not clash with existing Prisma-owned tables in `public`.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS catalog;

-- -------------------------------------------------------------
-- Categories
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Brands
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.brands (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Products
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog.products (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT          NOT NULL,
  description  TEXT,
  price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url    TEXT,
  category_id  INTEGER       NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  brand_id     INTEGER       NOT NULL REFERENCES catalog.brands(id)     ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Composite index tuned for cursor pagination (created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_catalog_products_created_at_id
  ON catalog.products (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_products_category_id
  ON catalog.products (category_id);

CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id
  ON catalog.products (brand_id);
