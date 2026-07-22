const { prisma } = require('../config/database.js')
const { query }  = require('../db/pool.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeOrder } = require('../utils/serialize.js')
const { resolveParentCategoryLabel } = require('../services/shopCategoryTreeService.js')
const { AppError } = require('../utils/AppError.js')

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

async function fetchRootCategoryById(id) {
  const numId = Number(id)
  if (!Number.isFinite(numId)) return null
  const { rows } = await query(
    `SELECT id, name, slug FROM catalog.categories WHERE id = $1 AND parent_id IS NULL`,
    [numId],
  )
  return rows[0] || null
}

async function findRootCategoryByName(name) {
  if (!name?.trim()) return null
  const { normalizeCategoryName } = require('../services/shopCategoryTreeService.js')
  const parentLabel = resolveParentCategoryLabel(name)
  const { rows } = await query(
    `SELECT id, name, slug FROM catalog.categories WHERE parent_id IS NULL`,
    [],
  )
  const normalizedReq = normalizeCategoryName(name)
  const normalizedLabel = normalizeCategoryName(parentLabel)
  return rows.find((row) => {
    const normName = normalizeCategoryName(row.name)
    return normName === normalizedReq || normName === normalizedLabel
  }) || null
}

async function buildCategorySlug(name, parentId) {
  const base = slugify(name)
  if (!parentId) return base
  const { rows } = await query(
    `SELECT slug FROM catalog.categories WHERE id = $1`,
    [Number(parentId)],
  )
  const parentSlug = rows[0]?.slug || 'category'
  return `${parentSlug}-${base}`
}

async function resolveSubcategoryParentId(existing, bodyParentId) {
  if (bodyParentId != null && bodyParentId !== '') {
    const parent = await fetchRootCategoryById(bodyParentId)
    if (!parent) {
      throw new AppError('Selected parent category was not found', 400, 'PARENT_NOT_FOUND')
    }
    return parent.id
  }

  if (existing.parentCategoryId) {
    const parent = await fetchRootCategoryById(existing.parentCategoryId)
    if (parent) return parent.id
  }

  const matched = await findRootCategoryByName(existing.parentCategoryName)
  if (matched) return matched.id

  throw new AppError(
    'Parent category not found. Approve the parent category first or select a valid parent before approving this subcategory.',
    400,
    'PARENT_NOT_FOUND',
  )
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

  const parent = parentId ? await fetchRootCategoryById(parentId) : null
  if (parentId && !parent) {
    return res.status(400).json({ success: false, error: { message: 'Invalid parent category' } })
  }

  const slug = await buildCategorySlug(name, parent?.id ?? null)

  const { rows } = await query(
    `INSERT INTO catalog.categories (name, slug, parent_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug, parent_id, created_at`,
    [name.trim(), slug, parent?.id ?? null],
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
  const numId = Number(id)
  if (!Number.isFinite(numId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid category id' } })
  }

  const { rowCount } = await query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM catalog.categories WHERE id = $1
       UNION ALL
       SELECT c.id FROM catalog.categories c
       INNER JOIN descendants d ON c.parent_id = d.id
     )
     DELETE FROM catalog.categories
     WHERE id IN (SELECT id FROM descendants)`,
    [numId],
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
  const { decision, adminNote, name, parentId } = req.body

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

    if (existing.requestType === 'SUBCATEGORY') {
      const resolvedParentId = await resolveSubcategoryParentId(existing, parentId)
      const slug = await buildCategorySlug(catName, resolvedParentId)
      await query(
        `INSERT INTO catalog.categories (name, slug, parent_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id`,
        [catName, slug, resolvedParentId],
      )
    } else {
      const slug = await buildCategorySlug(catName, null)
      await query(
        `INSERT INTO catalog.categories (name, slug, parent_id)
         VALUES ($1, $2, NULL)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = NULL`,
        [catName, slug],
      )
    }
  }

  res.json({ success: true, data: { request: updated } })
})

const listSubscribers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, role, status, planType } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    role: { in: ['BUYER', 'SELLER'] }
  }

  if (search) {
    const q = search.trim()
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { portalUserId: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
      { addresses: { some: { phone: { contains: q, mode: 'insensitive' } } } }
    ]
  }

  if (role && role !== 'ALL') {
    if (role === 'BOTH') {
      where.buyerSubscriptionStatus = 'ACTIVE'
      where.sellerSubscriptionStatus = 'ACTIVE'
    } else {
      where.role = role
    }
  }

  if (status && status !== 'ALL') {
    if (status === 'ACTIVE') {
      where.OR = [
        { buyerSubscriptionStatus: 'ACTIVE' },
        { sellerSubscriptionStatus: 'ACTIVE' }
      ]
    } else if (status === 'EXPIRED') {
      where.OR = [
        { buyerSubscriptionStatus: 'EXPIRED' },
        { sellerSubscriptionStatus: 'EXPIRED' }
      ]
    } else if (status === 'CANCELLED') {
      where.OR = [
        { buyerSubscriptionStatus: 'CANCELLED' },
        { sellerSubscriptionStatus: 'CANCELLED' }
      ]
    } else {
      where.OR = [
        { buyerSubscriptionStatus: status },
        { sellerSubscriptionStatus: status }
      ]
    }
  }

  if (planType && planType !== 'ALL') {
    const { resolveSubscriptionType } = require('../services/dealChargeService.js')
    const buyerPlansMatching = []
    const sellerPlansMatching = []
    const plans = ['BUYER_STANDARD', 'BUYER_MONTHLY', 'BUYER_ANNUAL', 'BUYER_LIFETIME', 'SELLER_MONTH', 'SELLER_MONTHLY', 'SELLER_ANNUAL', 'SELLER_LIFETIME', 'BOTH_MONTHLY', 'BOTH_ANNUAL', 'BOTH_LIFETIME', 'BOTH_STANDARD_MONTH', 'BOTH_LIFETIME_LIFETIME', 'BOTH_LIFETIME_MONTH', 'BOTH_STANDARD_LIFETIME']
    
    for (const plan of plans) {
      if (plan.startsWith('BOTH_')) {
        if (resolveSubscriptionType(plan, 'BUYER') === planType) buyerPlansMatching.push(plan)
        if (resolveSubscriptionType(plan, 'SELLER') === planType) sellerPlansMatching.push(plan)
      } else {
        if (resolveSubscriptionType(plan, plan.startsWith('BUYER_') ? 'BUYER' : 'SELLER') === planType) {
          if (plan.startsWith('BUYER_')) buyerPlansMatching.push(plan)
          else sellerPlansMatching.push(plan)
        }
      }
    }

    where.OR = [
      { buyerSubscriptionPlan: { in: buyerPlansMatching } },
      { sellerSubscriptionPlan: { in: sellerPlansMatching } }
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        subscriptions: { orderBy: { createdAt: 'desc' } }
      }
    }),
    prisma.user.count({ where })
  ])

  const { resolveSubscriptionType } = require('../services/dealChargeService.js')
  
  function computeSubscriptionType(user) {
    const buyerActive = user.buyerSubscriptionStatus === 'ACTIVE'
    const sellerActive = user.sellerSubscriptionStatus === 'ACTIVE'

    if (!buyerActive && !sellerActive) {
      return 'No Active Subscription'
    }

    const buyerPlan = user.buyerSubscriptionPlan || ''
    const sellerPlan = user.sellerSubscriptionPlan || ''

    if (buyerActive && sellerActive) {
      const mainPlan = buyerPlan || sellerPlan
      if (mainPlan.startsWith('BOTH_')) {
        if (mainPlan.includes('LIFETIME') || mainPlan === 'BOTH_LIFETIME') return 'Both Lifetime'
        if (mainPlan.includes('ANNUAL')) return 'Both Annual'
        return 'Both Monthly'
      }
      if (buyerPlan.includes('LIFETIME') && sellerPlan.includes('LIFETIME')) return 'Both Lifetime'
      if (buyerPlan.includes('ANNUAL') || sellerPlan.includes('ANNUAL')) return 'Both Annual'
      return 'Both Monthly'
    }

    if (buyerActive) {
      if (buyerPlan.includes('LIFETIME')) return 'Buyer Lifetime'
      if (buyerPlan.includes('ANNUAL')) return 'Buyer Annual'
      return 'Buyer Monthly'
    }

    if (sellerActive) {
      if (sellerPlan.includes('LIFETIME')) return 'Seller Lifetime'
      if (sellerPlan.includes('ANNUAL')) return 'Seller Annual'
      return 'Seller Monthly'
    }

    return 'No Active Subscription'
  }

  const mappedUsers = users.map(user => {
    const buyerSub = user.subscriptions.find(s => s.plan.startsWith('BUYER_') || s.plan.startsWith('BOTH_'))
    const sellerSub = user.subscriptions.find(s => s.plan.startsWith('SELLER_') || s.plan.startsWith('BOTH_'))
    
    const activeSub = (user.buyerSubscriptionStatus === 'ACTIVE' ? buyerSub : null) ||
                     (user.sellerSubscriptionStatus === 'ACTIVE' ? sellerSub : null) ||
                     buyerSub || sellerSub

    const isBothActive = user.buyerSubscriptionStatus === 'ACTIVE' && user.sellerSubscriptionStatus === 'ACTIVE'
    const statusStr = isBothActive
      ? 'ACTIVE'
      : (user.buyerSubscriptionStatus === 'ACTIVE' ? 'ACTIVE' : (user.sellerSubscriptionStatus === 'ACTIVE' ? 'ACTIVE' : (user.buyerSubscriptionStatus || user.sellerSubscriptionStatus || 'INACTIVE')))

    return {
      id: user.id,
      userId: user.portalUserId || user.id,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      userName: user.companyName || user.email.split('@')[0],
      createdAt: user.createdAt,
      phone: user.addresses[0]?.phone || '—',
      subscriptionType: computeSubscriptionType(user),
      status: statusStr,
      startsAt: activeSub ? (activeSub.startsAt || activeSub.createdAt) : user.createdAt,
      expiresAt: activeSub ? activeSub.expiresAt : null,
      isActive: user.isActive !== false,
      deactivatedAt: user.deactivatedAt ?? null,
      buyerSubscription: user.buyerSubscriptionStatus ? {
        plan: user.buyerSubscriptionPlan,
        status: user.buyerSubscriptionStatus,
        activatedAt: user.buyerSubscriptionActivatedAt,
        expiresAt: buyerSub ? buyerSub.expiresAt : null,
        startsAt: buyerSub ? buyerSub.startsAt : null,
        type: resolveSubscriptionType(user.buyerSubscriptionPlan, 'BUYER')
      } : null,
      sellerSubscription: user.sellerSubscriptionStatus ? {
        plan: user.sellerSubscriptionPlan,
        status: user.sellerSubscriptionStatus,
        activatedAt: user.sellerSubscriptionActivatedAt,
        expiresAt: sellerSub ? sellerSub.expiresAt : null,
        startsAt: sellerSub ? sellerSub.startsAt : null,
        type: resolveSubscriptionType(user.sellerSubscriptionPlan, 'SELLER')
      } : null
    }
  })

  res.json({
    success: true,
    data: {
      subscribers: mappedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 0
      }
    }
  })
})

const subscriberStats = asyncHandler(async (req, res) => {
  const buyersTotal = await prisma.user.count({
    where: {
      OR: [
        { role: 'BUYER' },
        { buyerSubscriptionStatus: { not: null } }
      ]
    }
  })

  const buyersActive = await prisma.user.count({
    where: { buyerSubscriptionStatus: 'ACTIVE' }
  })

  const buyersExpired = await prisma.user.count({
    where: { buyerSubscriptionStatus: { in: ['EXPIRED', 'CANCELLED'] } }
  })

  const sellersTotal = await prisma.user.count({
    where: {
      OR: [
        { role: 'SELLER' },
        { sellerSubscriptionStatus: { not: null } }
      ]
    }
  })

  const sellersActive = await prisma.user.count({
    where: { sellerSubscriptionStatus: 'ACTIVE' }
  })

  const sellersExpired = await prisma.user.count({
    where: { sellerSubscriptionStatus: { in: ['EXPIRED', 'CANCELLED'] } }
  })

  const bothActive = await prisma.user.count({
    where: {
      buyerSubscriptionStatus: 'ACTIVE',
      sellerSubscriptionStatus: 'ACTIVE'
    }
  })

  const bothTotal = await prisma.user.count({
    where: {
      buyerSubscriptionStatus: { not: null },
      sellerSubscriptionStatus: { not: null }
    }
  })

  const bothExpired = await prisma.user.count({
    where: {
      buyerSubscriptionStatus: { in: ['EXPIRED', 'CANCELLED'] },
      sellerSubscriptionStatus: { in: ['EXPIRED', 'CANCELLED'] }
    }
  })

  const paidPayments = await prisma.payment.findMany({
    where: { status: 'PAID' },
    select: { plan: true, amountPaise: true }
  })

  let buyerRevenue = 0
  let sellerRevenue = 0
  let bothRevenue = 0

  const buyerPlans = ['BUYER_STANDARD', 'BUYER_MONTHLY', 'BUYER_ANNUAL', 'BUYER_LIFETIME']
  const sellerPlans = ['SELLER_MONTH', 'SELLER_MONTHLY', 'SELLER_ANNUAL', 'SELLER_LIFETIME']
  const bundlePlans = ['BOTH_MONTHLY', 'BOTH_ANNUAL', 'BOTH_LIFETIME', 'BOTH_STANDARD_MONTH', 'BOTH_LIFETIME_LIFETIME', 'BOTH_LIFETIME_MONTH', 'BOTH_STANDARD_LIFETIME']

  for (const p of paidPayments) {
    if (buyerPlans.includes(p.plan)) {
      buyerRevenue += p.amountPaise
    } else if (sellerPlans.includes(p.plan)) {
      sellerRevenue += p.amountPaise
    } else if (bundlePlans.includes(p.plan)) {
      bothRevenue += p.amountPaise
    }
  }

  const formatRevenue = (paise) => (paise / 100).toFixed(2)

  res.json({
    success: true,
    data: {
      buyers: {
        total: buyersTotal,
        active: buyersActive,
        expired: buyersExpired,
        revenue: formatRevenue(buyerRevenue)
      },
      sellers: {
        total: sellersTotal,
        active: sellersActive,
        expired: sellersExpired,
        revenue: formatRevenue(sellerRevenue)
      },
      both: {
        total: bothTotal,
        active: bothActive,
        expired: bothExpired,
        revenue: formatRevenue(bothRevenue)
      }
    }
  })
})

const updateSubscriber = asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    role,
    buyerSubscriptionPlan,
    buyerSubscriptionStatus,
    sellerSubscriptionPlan,
    sellerSubscriptionStatus,
    expiresAt,
  } = req.body

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { subscriptions: { orderBy: { createdAt: 'desc' } } },
  })

  if (!existing || existing.role === 'ADMIN') {
    throw new AppError('Subscriber not found', 404, 'NOT_FOUND')
  }

  const data = {}
  if (role !== undefined) data.role = role
  if (buyerSubscriptionPlan !== undefined) data.buyerSubscriptionPlan = buyerSubscriptionPlan
  if (buyerSubscriptionStatus !== undefined) data.buyerSubscriptionStatus = buyerSubscriptionStatus
  if (sellerSubscriptionPlan !== undefined) data.sellerSubscriptionPlan = sellerSubscriptionPlan
  if (sellerSubscriptionStatus !== undefined) data.sellerSubscriptionStatus = sellerSubscriptionStatus

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data,
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        subscriptions: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (expiresAt !== undefined) {
      const parsedExpiry = expiresAt ? new Date(expiresAt) : null
      const activeSubs = user.subscriptions.filter((sub) => sub.status === 'ACTIVE')
      const targets = activeSubs.length ? activeSubs : user.subscriptions.slice(0, 1)
      for (const sub of targets) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { expiresAt: parsedExpiry },
        })
      }
    }

    return tx.user.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: 'desc' } },
        subscriptions: { orderBy: { createdAt: 'desc' } },
      },
    })
  })

  res.json({ success: true, data: { subscriber: updatedUser } })
})

const deactivateSubscriber = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing || existing.role === 'ADMIN') {
    throw new AppError('Subscriber not found', 404, 'NOT_FOUND')
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  })

  res.json({
    success: true,
    data: {
      subscriber: {
        id: updated.id,
        isActive: updated.isActive,
        deactivatedAt: updated.deactivatedAt,
      },
    },
  })
})

const reactivateSubscriber = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing || existing.role === 'ADMIN') {
    throw new AppError('Subscriber not found', 404, 'NOT_FOUND')
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      deactivatedAt: null,
    },
  })

  res.json({
    success: true,
    data: {
      subscriber: {
        id: updated.id,
        isActive: updated.isActive,
        deactivatedAt: updated.deactivatedAt,
      },
    },
  })
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
  listSubscribers,
  subscriberStats,
  updateSubscriber,
  deactivateSubscriber,
  reactivateSubscriber,
}
