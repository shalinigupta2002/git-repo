/**
 * Public browse helpers for seller-owned listings (Prisma `products` table).
 * Maps seller listings into the same shape the catalog API returns.
 */

const fs = require('fs')
const path = require('path')
const { prisma } = require('../config/database.js')

const CATEGORY_SLUG_TO_LABEL = {
  mobiles: 'Moblie & accessories',
  computers: 'Computers & Accessories',
  tv: 'TV, Appliances, Electronics',
  'mens-fashion': "Men's Fashion",
  'womens-fashion': "Women's Fashion",
  'home-kitchen': 'Home, Kitchen, Pets',
  beauty: 'Beauty, Health, Grocery',
  sports: 'Sports, Fitness, Bags, Luggage',
  toys: "Toys, Baby Products, Kids' Fashion",
  car: 'Car, Motorbike, Industrial',
  books: 'Books',
  movies: 'Movies, Music & Video Games',
}

let categoryIdToLabel = null

function loadCategoryIdToLabel() {
  if (categoryIdToLabel) return categoryIdToLabel

  categoryIdToLabel = { ...CATEGORY_SLUG_TO_LABEL }
  try {
    const treePath = path.join(__dirname, '../../../client/src/utils/shopCategoryTree.js')
    const source = fs.readFileSync(treePath, 'utf8')
    for (const match of source.matchAll(/id:\s*'([^']+)',\s*label:\s*'([^']+)'/g)) {
      categoryIdToLabel[match[1]] = match[2]
    }
  } catch {
    // Fall back to slug map only when the client tree is unavailable.
  }

  return categoryIdToLabel
}

function parseProductMeta(description) {
  if (!description) return { category: null, brand: null }
  const categoryMatch = description.match(/Category:\s*([^.]+)\./)
  const brandMatch = description.match(/Brand:\s*([^.]+)\./)
  return {
    category: categoryMatch?.[1]?.trim() || null,
    brand: brandMatch?.[1]?.trim() || null,
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function firstImageUrl(images) {
  if (!images) return null
  const list = Array.isArray(images) ? images : []
  const hit = list.find((item) => item?.url)
  return hit?.url ?? null
}

function categoryMatches(categoryPath, filter) {
  if (!filter) return true
  if (!categoryPath) return false

  const labels = loadCategoryIdToLabel()
  const needle = (labels[filter] || filter).toLowerCase()
  return categoryPath.toLowerCase().includes(needle)
}

function brandMatches(brandName, filter) {
  if (!filter) return true
  if (!brandName) return false
  const wanted = filter.trim().toLowerCase()
  return (
    brandName.toLowerCase() === wanted ||
    slugify(brandName) === slugify(filter)
  )
}

function mapSellerProduct(product) {
  const meta = parseProductMeta(product.description)
  const categoryName = meta.category?.split('>').map((part) => part.trim())[0] || null
  const brandName = meta.brand || product.seller?.companyName || null

  return {
    id: product.id,
    title: product.name,
    description: product.description,
    price: Number(product.price),
    imageUrl: firstImageUrl(product.images),
    createdAt: product.createdAt,
    category: {
      slug: slugify(categoryName),
      name: categoryName,
    },
    brand: {
      slug: slugify(brandName),
      name: brandName,
    },
    source: 'seller',
    seller: product.seller
      ? {
          id: product.seller.id,
          email: product.seller.email,
          companyName: product.seller.companyName,
        }
      : null,
    stockQty: product.stockQty,
    moq: product.moq,
    currency: product.currency,
  }
}

/**
 * List active seller listings for the public products page.
 * Filters mirror the catalog browse API (q, category, brand).
 */
async function listSellerProducts({ q, category, brand, limit = 100 } = {}) {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 100, 1), 500),
    include: {
      seller: { select: { id: true, email: true, companyName: true } },
    },
  })

  const query = q?.trim().toLowerCase() || ''

  return rows
    .map(mapSellerProduct)
    .filter((product) => {
      const meta = parseProductMeta(product.description)
      if (!categoryMatches(meta.category, category)) return false
      if (!brandMatches(meta.brand, brand)) return false
      if (!query) return true
      const haystack = `${product.title} ${product.description || ''} ${meta.brand || ''}`.toLowerCase()
      return haystack.includes(query)
    })
}

async function getSellerProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id: String(id) },
    include: {
      seller: { select: { id: true, email: true, companyName: true } },
    },
  })

  if (!product || !product.isActive) return null
  return mapSellerProduct(product)
}

module.exports = {
  listSellerProducts,
  getSellerProductById,
  parseProductMeta,
}
