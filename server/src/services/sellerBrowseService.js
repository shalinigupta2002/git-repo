/**
 * Public browse helpers for seller-owned listings (Prisma `products` table).
 * Maps seller listings into the same shape the catalog API returns.
 */

const fs = require('fs')
const path = require('path')
const { prisma } = require('../config/database.js')
const { USER_PUBLIC_SELECT, pickUserCity, mapMaskedParty } = require('./sellerProfileService.js')

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

function normalizeProductImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function firstImageUrl(images) {
  const list = normalizeProductImages(images)
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
    seller: product.seller ? mapMaskedParty(product.seller, 'SELLER', { dealAccepted: false, dealChargesPaid: false }) : null,
    stockQty: product.stockQty,
    moq: product.moq,
    currency: product.currency || 'INR',
  }
}

function filterSellerProducts(products, { q, category, brand } = {}) {
  const query = q?.trim().toLowerCase() || ''

  return products.filter((product) => {
    const meta = parseProductMeta(product.description)
    if (!categoryMatches(meta.category, category)) return false
    if (!brandMatches(meta.brand, brand)) return false
    if (!query) return true
    const haystack = `${product.title} ${product.description || ''} ${meta.brand || ''}`.toLowerCase()
    return haystack.includes(query)
  })
}

/**
 * List active seller listings for the public products page.
 * Only seller-added products are returned (no seeded catalog rows).
 */
async function listSellerProducts({ q, category, brand, limit = 12, cursor } = {}) {
  const pageSize = Math.min(Math.max(Number(limit) || 12, 1), 50)
  const offset = cursor ? Math.max(Number.parseInt(String(cursor), 10) || 0, 0) : 0

  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      seller: { select: USER_PUBLIC_SELECT },
    },
  })

  const filtered = filterSellerProducts(rows.map(mapSellerProduct), { q, category, brand })
  const products = filtered.slice(offset, offset + pageSize)
  const nextCursor = offset + pageSize < filtered.length ? String(offset + pageSize) : null

  return { products, nextCursor }
}

async function getSellerProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id: String(id) },
    include: {
      seller: { select: USER_PUBLIC_SELECT },
    },
  })

  if (!product || !product.isActive) return null
  return mapSellerProduct(product)
}

/**
 * Other active seller listings in the same category/brand (for multi-seller RFQ).
 */
async function findAlternativeSellerListings(productId, { limit = 12 } = {}) {
  const source = await prisma.product.findUnique({
    where: { id: String(productId), isActive: true },
    select: { id: true, sellerId: true, name: true, description: true },
  })
  if (!source) return []

  const meta = parseProductMeta(source.description)
  const categoryName = meta.category?.split('>').map((part) => part.trim())[0] || null
  const brandName = meta.brand || null

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: source.id },
      sellerId: { not: source.sellerId },
    },
    include: { seller: { select: USER_PUBLIC_SELECT } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const normalizedTitle = source.name.trim().toLowerCase()
  const mapped = rows
    .map(mapSellerProduct)
    .filter((product) => {
      const productMeta = parseProductMeta(product.description)
      const productCategory = productMeta.category?.split('>').map((part) => part.trim())[0] || null
      const productBrand = productMeta.brand || null
      const titleMatch = product.title?.trim().toLowerCase() === normalizedTitle
      const categoryMatch = categoryName && productCategory
        ? productCategory.toLowerCase() === categoryName.toLowerCase()
        : false
      const brandMatch = brandName && productBrand
        ? productBrand.toLowerCase() === brandName.toLowerCase()
        : false
      return titleMatch || (categoryMatch && brandMatch)
    })

  return mapped.slice(0, Math.min(Math.max(limit, 1), 50))
}

module.exports = {
  listSellerProducts,
  getSellerProductById,
  findAlternativeSellerListings,
  parseProductMeta,
  mapSellerProduct,
}
