const { CATALOG, EXTRA_BRANDS } = require('./constants.js')
const { slugify, sqlString } = require('./helpers.js')

async function ensureCatalogSchema(prisma) {
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS catalog')
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      parent_id INTEGER REFERENCES catalog.categories(id) ON DELETE SET NULL
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.brands (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.products (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      image_url TEXT,
      category_id INTEGER NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
      brand_id INTEGER NOT NULL REFERENCES catalog.brands(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent_id ON catalog.categories (parent_id)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_created_at_id ON catalog.products (created_at DESC, id DESC)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_category_id ON catalog.products (category_id)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id ON catalog.products (brand_id)')
}

/** Upsert master taxonomy only — categories, subcategories, brands. No browse products. */
async function seedMasterCatalog(prisma) {
  await ensureCatalogSchema(prisma)

  for (const category of CATALOG) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO catalog.categories (name, slug, parent_id)
      VALUES (${sqlString(category.name)}, ${sqlString(category.slug)}, NULL)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `)

    for (const subcategory of category.subcategories) {
      const slug = `${category.slug}-${slugify(subcategory)}`
      await prisma.$executeRawUnsafe(`
        INSERT INTO catalog.categories (name, slug, parent_id)
        VALUES (
          ${sqlString(subcategory)},
          ${sqlString(slug)},
          (SELECT id FROM catalog.categories WHERE slug = ${sqlString(category.slug)} LIMIT 1)
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          parent_id = EXCLUDED.parent_id
      `)
    }
  }

  const allBrands = [...new Set([
    ...CATALOG.flatMap((c) => c.brands),
    ...EXTRA_BRANDS,
  ])]

  for (const brand of allBrands) {
    const slug = slugify(brand)
    await prisma.$executeRawUnsafe(`
      INSERT INTO catalog.brands (name, slug)
      VALUES (${sqlString(brand)}, ${sqlString(slug)})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `)
  }

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM catalog.categories WHERE parent_id IS NULL) AS top_categories,
      (SELECT COUNT(*)::int FROM catalog.categories WHERE parent_id IS NOT NULL) AS subcategories,
      (SELECT COUNT(*)::int FROM catalog.brands) AS brands,
      (SELECT COUNT(*)::int FROM catalog.products) AS products
  `)
  const stats = rows[0] || {}

  return {
    topCategories: Number(stats.top_categories ?? CATALOG.length),
    subcategories: Number(stats.subcategories ?? 0),
    brands: Number(stats.brands ?? allBrands.length),
    products: Number(stats.products ?? 0),
  }
}

module.exports = { seedMasterCatalog, ensureCatalogSchema }
