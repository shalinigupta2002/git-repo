const { prisma } = require('../config/database.js')
const { query }  = require('../db/pool.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeOrder } = require('../utils/serialize.js')

function serializeUserSafe(u) {
  if (!u) return u
  return {
    id:          u.id,
    email:       u.email,
    role:        u.role,
    companyName: u.companyName,
    createdAt:   u.createdAt,
    updatedAt:   u.updatedAt,
  }
}

const listBuyers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query
  const skip = (page - 1) * limit

  const where = { role: 'BUYER' }
  if (search) {
    where.OR = [
      { email:       { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, role: true,
        companyName: true, createdAt: true, updatedAt: true,
        _count: { select: { buyerOrders: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      buyers: rows.map((u) => ({ ...serializeUserSafe(u), ordersPlaced: u._count.buyerOrders })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    },
  })
})

const listSellers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query
  const skip = (page - 1) * limit

  const where = { role: 'SELLER' }
  if (search) {
    where.OR = [
      { email:       { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, role: true,
        companyName: true, createdAt: true, updatedAt: true,
        _count: { select: { products: true, sellerOrders: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      sellers: rows.map((u) => ({
        ...serializeUserSafe(u),
        productsCount: u._count.products,
        ordersCount:   u._count.sellerOrders,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    },
  })
})

const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, status, buyerId, sellerId } = req.query
  const skip = (page - 1) * limit

  const where = {}
  if (status)   where.status   = status
  if (buyerId)  where.buyerId  = buyerId
  if (sellerId) where.sellerId = sellerId

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer:  { select: { id: true, email: true, companyName: true } },
        seller: { select: { id: true, email: true, companyName: true } },
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      transactions: rows.map(serializeOrder),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    },
  })
})

const stats = asyncHandler(async (req, res) => {
  const [buyers, sellers, products, orders, revenueAgg] = await Promise.all([
    prisma.user.count({ where: { role: 'BUYER' } }),
    prisma.user.count({ where: { role: 'SELLER' } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum:  { totalAmount: true },
      where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
    }),
  ])

  res.json({
    success: true,
    data: {
      buyers,
      sellers,
      products,
      orders,
      revenue: revenueAgg._sum.totalAmount?.toString() ?? '0',
    },
  })
})

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, actorId, action, resource, resourceId, from, to } = req.query
  const skip = (page - 1) * limit

  const where = {}
  if (actorId)    where.actorId    = actorId
  if (action)     where.action     = action
  if (resource)   where.resource   = resource
  if (resourceId) where.resourceId = resourceId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to)   where.createdAt.lte = new Date(to)
  }

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:         true,
        action:     true,
        resource:   true,
        resourceId: true,
        meta:       true,
        ipAddress:  true,
        createdAt:  true,
        actor: { select: { id: true, email: true, role: true, companyName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      logs: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    },
  })
})

// ─── Catalog Category Management (uses raw pg pool → catalog schema) ──────────

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const listCategories = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, parent_id, created_at
     FROM catalog.categories
     ORDER BY COALESCE(parent_id, id), name ASC`,
    [],
  )

  const roots = []
  const map   = {}
  for (const r of rows) {
    map[r.id] = {
      id:            r.id,
      name:          r.name,
      slug:          r.slug,
      parentId:      r.parent_id,
      createdAt:     r.created_at,
      subcategories: [],
    }
  }
  for (const r of rows) {
    if (r.parent_id) {
      map[r.parent_id]?.subcategories.push(map[r.id])
    } else {
      roots.push(map[r.id])
    }
  }

  res.json({ success: true, data: { categories: roots } })
})

const createCategory = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { message: 'name is required' } })
  }
  const slug = slugify(name)

  const { rows } = await query(
    `INSERT INTO catalog.categories (name, slug, parent_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug, parent_id, created_at`,
    [name.trim(), slug, parentId || null],
  )

  res.status(201).json({
    success: true,
    data: {
      category: {
        id:       rows[0].id,
        name:     rows[0].name,
        slug:     rows[0].slug,
        parentId: rows[0].parent_id,
        createdAt:rows[0].created_at,
      },
    },
  })
})

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, parentId } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { message: 'name is required' } })
  }
  const slug = slugify(name)

  const { rows, rowCount } = await query(
    `UPDATE catalog.categories SET name = $1, slug = $2, parent_id = $3
     WHERE id = $4
     RETURNING id, name, slug, parent_id, created_at`,
    [name.trim(), slug, parentId ?? null, Number(id)],
  )

  if (rowCount === 0) {
    return res.status(404).json({ success: false, error: { message: 'Category not found' } })
  }

  res.json({
    success: true,
    data: {
      category: {
        id:       rows[0].id,
        name:     rows[0].name,
        slug:     rows[0].slug,
        parentId: rows[0].parent_id,
        createdAt:rows[0].created_at,
      },
    },
  })
})

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rowCount } = await query(
    'DELETE FROM catalog.categories WHERE id = $1',
    [Number(id)],
  )

  if (rowCount === 0) {
    return res.status(404).json({ success: false, error: { message: 'Category not found' } })
  }

  res.json({ success: true, data: { message: 'Category deleted' } })
})

// ─── Category Requests (seller → admin approval workflow) ─────────────────────

const listCategoryRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {}
  if (status) where.status = status

  const [rows, total] = await Promise.all([
    prisma.categoryRequest.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, email: true, companyName: true } },
      },
    }),
    prisma.categoryRequest.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      requests:   rows,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 0,
      },
    },
  })
})

const decideCategoryRequest = asyncHandler(async (req, res) => {
  const { id }                 = req.params
  const { decision, adminNote, name } = req.body

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ success: false, error: { message: 'decision must be APPROVED or REJECTED' } })
  }

  const existing = await prisma.categoryRequest.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Request not found' } })
  }
  if (existing.status !== 'PENDING') {
    return res.status(409).json({ success: false, error: { message: 'Request already decided' } })
  }

  const updated = await prisma.categoryRequest.update({
    where: { id },
    data: {
      status:           decision,
      adminNote:        adminNote || null,
      notificationRead: false,
    },
  })

  if (decision === 'APPROVED') {
    const catName = (name?.trim()) || existing.categoryName
    const slug    = slugify(catName)

    if (existing.requestType === 'SUBCATEGORY' && existing.parentCategoryName) {
      // Find the parent category by name (case-insensitive)
      const { rows: parentRows } = await query(
        `SELECT id FROM catalog.categories WHERE LOWER(name) = LOWER($1) AND parent_id IS NULL LIMIT 1`,
        [existing.parentCategoryName],
      )
      const parentId = parentRows[0]?.id || null
      await query(
        `INSERT INTO catalog.categories (name, slug, parent_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id`,
        [catName, slug, parentId],
      )
    } else {
      await query(
        `INSERT INTO catalog.categories (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [catName, slug],
      )
    }
  }

  res.json({ success: true, data: { request: updated } })
})

module.exports = {
  listBuyers,
  listSellers,
  listTransactions,
  stats,
  listAuditLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoryRequests,
  decideCategoryRequest,
}
