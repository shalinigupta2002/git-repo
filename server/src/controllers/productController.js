const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeProduct } = require('../utils/serialize.js')
const { writeAuditLog } = require('../utils/audit.js')

const list = asyncHandler(async (req, res) => {
  const { page, limit, sellerId, includeInactive, search, mine } = req.query
  const skip = (page - 1) * limit

  const where = {}

  if (mine === true) {
    if (req.user?.role !== 'SELLER') {
      throw new AppError('mine=true requires seller authentication', 400, 'VALIDATION_ERROR')
    }
    where.sellerId = req.user.id
    if (!includeInactive) where.isActive = true
  } else {
    if (sellerId) where.sellerId = sellerId
    const adminAll = req.user?.role === 'ADMIN' && includeInactive === true
    if (!adminAll) where.isActive = true
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku:  { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, email: true, companyName: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      products: rows.map(serializeProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  })
})

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const product = await prisma.product.findUnique({
    where:   { id },
    include: { seller: { select: { id: true, email: true, companyName: true } } },
  })

  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')

  const canSeeInactive =
    req.user?.role === 'ADMIN' ||
    (req.user?.role === 'SELLER' && req.user.id === product.sellerId)

  if (!product.isActive && !canSeeInactive) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  res.json({ success: true, data: { product: serializeProduct(product) } })
})

const create = asyncHandler(async (req, res) => {
  // Role is already enforced by authorize('SELLER', 'ADMIN') in the route.
  // Subscription is enforced by requireSubscription('SELLER') in the route.
  let sellerId = req.user.id
  if (req.user.role === 'ADMIN') {
    if (!req.body.sellerId) {
      throw new AppError('sellerId is required when creating as admin', 400, 'VALIDATION_ERROR')
    }
    sellerId = req.body.sellerId
  }

  const { sku, name, description, price, moq, currency, isActive, trackInventory, stockQty } = req.body

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sellerId,
          sku,
          name,
          description:    description ?? null,
          price:          new Prisma.Decimal(String(price)),
          moq:            moq ?? 1,
          currency:       currency || 'INR',
          isActive:       isActive !== false,
          trackInventory: trackInventory ?? false,
          stockQty:       stockQty ?? 0,
        },
        include: { seller: { select: { id: true, email: true, companyName: true } } },
      })

      // Log initial stock if inventory is tracked and stock > 0
      if (created.trackInventory && created.stockQty > 0) {
        await tx.inventoryLog.create({
          data: {
            productId:   created.id,
            delta:       created.stockQty,
            reason:      'RESTOCK',
            performedBy: req.user.id,
            note:        'Initial stock on product creation',
          },
        })
      }

      return created
    })

    writeAuditLog({ actorId: req.user.id, action: 'CREATE', resource: 'product', resourceId: product.id, req }).catch(() => {})

    res.status(201).json({ success: true, data: { product: serializeProduct(product) } })
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('SKU already exists for this seller', 409, 'DUPLICATE_SKU')
    }
    throw e
  }
})

const update = asyncHandler(async (req, res) => {
  const { id } = req.params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')

  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const { sku, name, description, price, moq, currency, isActive, trackInventory } = req.body

  const data = {}
  if (sku            !== undefined) data.sku            = sku
  if (name           !== undefined) data.name           = name
  if (description    !== undefined) data.description    = description
  if (price          !== undefined) data.price          = new Prisma.Decimal(String(price))
  if (moq            !== undefined) data.moq            = moq
  if (currency       !== undefined) data.currency       = currency
  if (isActive       !== undefined) data.isActive       = isActive
  if (trackInventory !== undefined) data.trackInventory = trackInventory

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400, 'VALIDATION_ERROR')
  }

  try {
    const updated = await prisma.product.update({
      where:   { id },
      data,
      include: { seller: { select: { id: true, email: true, companyName: true } } },
    })

    writeAuditLog({ actorId: req.user.id, action: 'UPDATE', resource: 'product', resourceId: id, meta: data, req }).catch(() => {})

    res.json({ success: true, data: { product: serializeProduct(updated) } })
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('SKU already exists for this seller', 409, 'DUPLICATE_SKU')
    }
    throw e
  }
})

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  await prisma.product.delete({ where: { id } })

  writeAuditLog({ actorId: req.user.id, action: 'DELETE', resource: 'product', resourceId: id, req }).catch(() => {})

  res.status(204).send()
})

/**
 * POST /api/products/:id/stock
 *
 * Sellers adjust their own product stock; admins can adjust any product.
 * Uses the RESTOCK or ADJUSTMENT reason.  ORDER_* reasons are automated by
 * the order lifecycle and are not accepted here.
 */
const stockAdjust = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { delta, reason, note } = req.body

  const product = await prisma.product.findUnique({
    where:  { id },
    select: { id: true, sellerId: true, trackInventory: true, stockQty: true, reservedQty: true, name: true },
  })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }
  if (!product.trackInventory) {
    throw new AppError(
      'Inventory tracking is not enabled for this product. Enable trackInventory first.',
      400,
      'INVENTORY_NOT_TRACKED',
    )
  }

  const newStock = product.stockQty + delta
  if (newStock < 0) {
    throw new AppError(
      `Adjustment would result in negative stock (current: ${product.stockQty}, delta: ${delta})`,
      400,
      'NEGATIVE_STOCK',
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.inventoryLog.create({
      data: {
        productId:   id,
        delta,
        reason,
        performedBy: req.user.id,
        note:        note ?? null,
      },
    })
    return tx.product.update({
      where:   { id },
      data:    { stockQty: { increment: delta } },
      select:  { id: true, stockQty: true, reservedQty: true, trackInventory: true },
    })
  })

  writeAuditLog({
    actorId:    req.user.id,
    action:     'STOCK_ADJUST',
    resource:   'product',
    resourceId: id,
    meta:       { delta, reason, newStockQty: updated.stockQty },
    req,
  }).catch(() => {})

  res.json({
    success: true,
    data: {
      productId:    id,
      stockQty:     updated.stockQty,
      reservedQty:  updated.reservedQty,
      availableQty: updated.stockQty - updated.reservedQty,
    },
  })
})

/**
 * GET /api/products/:id/inventory-logs
 *
 * Returns the full stock movement history for a product.
 * Only accessible by the owning seller or an admin.
 */
const inventoryLogs = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 50 } = req.query

  const product = await prisma.product.findUnique({
    where:  { id },
    select: { sellerId: true },
  })
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND')
  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const skip = (Number(page) - 1) * Number(limit)
  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where:   { productId: id },
      orderBy: { createdAt: 'desc' },
      skip,
      take:    Number(limit),
    }),
    prisma.inventoryLog.count({ where: { productId: id } }),
  ])

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 0,
      },
    },
  })
})

module.exports = { list, getById, create, update, remove, stockAdjust, inventoryLogs }
