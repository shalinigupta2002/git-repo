const crypto = require('crypto')
const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { pickUserCity, mapPublicUser, USER_PUBLIC_SELECT } = require('../services/sellerProfileService.js')
const { writeAuditLog } = require('../utils/audit.js')
const { serializeOrder } = require('../utils/serialize.js')

function generateOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

/**
 * Allowed status transitions for a B2B order lifecycle.
 *
 * PENDING   → CONFIRMED | CANCELLED  (seller accepts or rejects)
 * CONFIRMED → SHIPPED   | CANCELLED  (seller ships or cancels)
 * SHIPPED   → DELIVERED              (delivery confirmed)
 * DELIVERED → (terminal)
 * CANCELLED → (terminal)
 */
const VALID_TRANSITIONS = Object.freeze({
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED',   'CANCELLED'],
  SHIPPED:   ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
})

// Reusable include shape for full order response
const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, sku: true, name: true } },
    },
  },
  buyer:   { select: USER_PUBLIC_SELECT },
  seller:  { select: USER_PUBLIC_SELECT },
  history: {
    orderBy:  { createdAt: 'asc' },
    select: {
      id:         true,
      fromStatus: true,
      toStatus:   true,
      note:       true,
      createdAt:  true,
      changedBy:  { select: { id: true, email: true, companyName: true } },
    },
  },
}

/**
 * Handle inventory side-effects for ORDER_RESERVED (on create) and
 * ORDER_CONFIRMED / ORDER_CANCELLED (on status change).
 * Runs INSIDE an existing Prisma transaction.
 *
 * @param {object}   tx            Prisma transaction client
 * @param {object[]} items         Array of { productId, quantity }
 * @param {'ORDER_RESERVED'|'ORDER_CONFIRMED'|'ORDER_CANCELLED'} reason
 * @param {string}   orderId       For the InventoryLog referenceId
 * @param {string}   performedBy   Actor userId
 * @param {string}   previousStatus  Only needed for CANCELLED to determine delta direction
 */
async function applyInventoryChanges(tx, items, reason, orderId, performedBy, previousStatus) {
  // Load current stock state for all affected products
  const productIds = items.map((i) => i.productId)
  const products = await tx.product.findMany({
    where:  { id: { in: productIds }, trackInventory: true },
    select: { id: true, stockQty: true, reservedQty: true, name: true },
  })

  if (products.length === 0) return // nothing to do — no tracked products

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  for (const item of items) {
    const p = productMap[item.productId]
    if (!p) continue // product not tracked — skip

    const qty = item.quantity

    if (reason === 'ORDER_RESERVED') {
      // Check availability before reserving
      const available = p.stockQty - p.reservedQty
      if (available < qty) {
        throw new AppError(
          `Insufficient stock for "${p.name}": ${available} units available, ${qty} requested`,
          400,
          'INSUFFICIENT_STOCK',
        )
      }
      await tx.product.update({
        where: { id: p.id },
        data:  { reservedQty: { increment: qty } },
      })
      await tx.inventoryLog.create({
        data: {
          productId: p.id, delta: -qty, reason: 'ORDER_RESERVED',
          referenceId: orderId, performedBy,
          note: `Stock reserved for order`,
        },
      })
    }

    if (reason === 'ORDER_CONFIRMED') {
      // Hard deduction: decrement both stockQty and reservedQty
      await tx.product.update({
        where: { id: p.id },
        data:  { stockQty: { decrement: qty }, reservedQty: { decrement: qty } },
      })
      await tx.inventoryLog.create({
        data: {
          productId: p.id, delta: -qty, reason: 'ORDER_CONFIRMED',
          referenceId: orderId, performedBy,
          note: `Stock deducted on order confirmation`,
        },
      })
    }

    if (reason === 'ORDER_CANCELLED') {
      if (previousStatus === 'PENDING') {
        // Release the soft reservation only
        await tx.product.update({
          where: { id: p.id },
          data:  { reservedQty: { decrement: qty } },
        })
        await tx.inventoryLog.create({
          data: {
            productId: p.id, delta: qty, reason: 'ORDER_CANCELLED',
            referenceId: orderId, performedBy,
            note: `Reservation released on order cancellation (was PENDING)`,
          },
        })
      } else if (previousStatus === 'CONFIRMED') {
        // Return stock to available pool
        await tx.product.update({
          where: { id: p.id },
          data:  { stockQty: { increment: qty } },
        })
        await tx.inventoryLog.create({
          data: {
            productId: p.id, delta: qty, reason: 'ORDER_CANCELLED',
            referenceId: orderId, performedBy,
            note: `Stock returned on order cancellation (was CONFIRMED)`,
          },
        })
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const create = asyncHandler(async (req, res) => {
  // Role is already enforced by authorize('BUYER', 'ADMIN') in the route.
  // Subscription is enforced by requireSubscription('BUYER') in the route.
  const { items, notes, shippingAddress, billingAddress } = req.body
  const buyerId = req.user.role === 'ADMIN' ? req.body.buyerId : req.user.id
  if (req.user.role === 'ADMIN' && !req.body.buyerId) {
    throw new AppError('buyerId is required when creating order as admin', 400, 'VALIDATION_ERROR')
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  const rawKey = req.headers['x-idempotency-key']
  const idempotencyKey = rawKey ? String(rawKey).trim().slice(0, 128) || null : null

  if (idempotencyKey) {
    const existing = await prisma.order.findFirst({
      where:   { idempotencyKey, buyerId },
      include: ORDER_INCLUDE,
    })
    if (existing) {
      return res.status(200).json({
        success: true,
        data: { order: serializeOrder(existing), idempotent: true },
      })
    }
  }

  // ── Basic input validation ───────────────────────────────────────────────
  const productIdsRaw = items.map((i) => i.productId)
  if (new Set(productIdsRaw).size !== productIdsRaw.length) {
    throw new AppError(
      'Duplicate product lines — use a single line with the total quantity',
      400,
      'DUPLICATE_LINES',
    )
  }

  // ── Atomic order creation ────────────────────────────────────────────────
  // Products are fetched INSIDE the transaction to minimize the TOCTOU window
  // (deactivation or stock exhaustion between check and insert is caught).
  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where:  { id: { in: productIdsRaw }, isActive: true },
      select: { id: true, sellerId: true, price: true, moq: true, name: true, trackInventory: true, stockQty: true, reservedQty: true },
    })

    if (products.length !== productIdsRaw.length) {
      throw new AppError('One or more products are invalid or no longer available', 400, 'INVALID_PRODUCTS')
    }

    const sellerId = products[0].sellerId
    if (products.some((p) => p.sellerId !== sellerId)) {
      throw new AppError('All line items must be from the same seller', 400, 'SELLER_MISMATCH')
    }

    let total = new Prisma.Decimal(0)
    const lineRows = []

    for (const line of items) {
      const p = products.find((x) => x.id === line.productId)
      if (!p) continue
      if (line.quantity < p.moq) {
        throw new AppError(`Quantity for "${p.name}" must be at least MOQ (${p.moq})`, 400, 'BELOW_MOQ')
      }
      const unitPrice = new Prisma.Decimal(p.price.toString())
      const lineTotal  = unitPrice.mul(line.quantity)
      total = total.add(lineTotal)
      lineRows.push({ productId: p.id, quantity: line.quantity, unitPrice, lineTotal })
    }

    const created = await tx.order.create({
      data: {
        orderNumber:      generateOrderNumber(),
        buyerId,
        sellerId,
        status:           'PENDING',
        totalAmount:      total,
        notes:            notes ?? null,
        idempotencyKey,
        shippingSnapshot: shippingAddress ?? null,
        billingSnapshot:  billingAddress  ?? null,
        items:   { create: lineRows },
        history: {
          create: {
            fromStatus:  null,
            toStatus:    'PENDING',
            note:        'Order created',
            changedById: req.user.id,
          },
        },
      },
      include: ORDER_INCLUDE,
    })

    // Soft-reserve stock for tracked products
    await applyInventoryChanges(tx, lineRows, 'ORDER_RESERVED', created.id, req.user.id, null)

    return created
  })

  writeAuditLog({ actorId: req.user.id, action: 'CREATE', resource: 'order', resourceId: order.id, req }).catch(() => {})

  res.status(201).json({ success: true, data: { order: serializeOrder(order) } })
})

// ─────────────────────────────────────────────────────────────────────────────

const list = asyncHandler(async (req, res) => {
  const { page, limit, status, scope } = req.query
  const skip = (page - 1) * limit

  const where = {}
  if (status) where.status = status

  if (scope === 'buyer') {
    where.buyerId = req.user.id
  } else if (scope === 'seller') {
    where.sellerId = req.user.id
  } else if (req.user.role === 'BUYER') {
    where.buyerId = req.user.id
  } else if (req.user.role === 'SELLER') {
    where.sellerId = req.user.id
  }

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
        buyer:  { select: { id: true, email: true, companyName: true } },
        seller: { select: { id: true, email: true, companyName: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      orders: rows.map(serializeOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    },
  })
})

// ─────────────────────────────────────────────────────────────────────────────

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where:   { id },
    include: {
      ...ORDER_INCLUDE,
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true, price: true } },
        },
      },
    },
  })

  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND')

  const allowed =
    req.user.role === 'ADMIN' ||
    order.buyerId  === req.user.id ||
    order.sellerId === req.user.id

  if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN')

  res.json({ success: true, data: { order: serializeOrder(order) } })
})

// ─────────────────────────────────────────────────────────────────────────────

const getHistory = asyncHandler(async (req, res) => {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where:  { id },
    select: { buyerId: true, sellerId: true },
  })
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND')

  const allowed =
    req.user.role === 'ADMIN' ||
    order.buyerId  === req.user.id ||
    order.sellerId === req.user.id
  if (!allowed) throw new AppError('Forbidden', 403, 'FORBIDDEN')

  const history = await prisma.orderHistory.findMany({
    where:   { orderId: id },
    orderBy: { createdAt: 'asc' },
    select: {
      id:         true,
      fromStatus: true,
      toStatus:   true,
      note:       true,
      createdAt:  true,
      changedBy:  { select: { id: true, email: true, companyName: true } },
    },
  })

  res.json({ success: true, data: { history } })
})

// ─────────────────────────────────────────────────────────────────────────────

const updateStatus = asyncHandler(async (req, res) => {
  const { id }         = req.params
  const { status, note } = req.body

  // ── Lightweight pre-check for existence and ownership ────────────────────
  const current = await prisma.order.findUnique({
    where:  { id },
    select: { id: true, status: true, sellerId: true },
  })
  if (!current) throw new AppError('Order not found', 404, 'NOT_FOUND')

  if (req.user.role === 'SELLER' && current.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const allowed = VALID_TRANSITIONS[current.status] ?? []
  if (!allowed.includes(status)) {
    throw new AppError(
      `Cannot transition order from "${current.status}" to "${status}". ` +
      (allowed.length
        ? `Allowed next states: ${allowed.join(', ')}.`
        : 'Order is in a terminal state.'),
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  const previousStatus = current.status

  // ── Atomic conditional update + history entry + inventory side-effects ───
  const updated = await prisma.$transaction(async (tx) => {
    // Optimistic lock: only update if status hasn't been changed concurrently
    const { count } = await tx.order.updateMany({
      where: { id, status: previousStatus },
      data:  { status },
    })
    if (count === 0) {
      throw new AppError(
        'Order status was modified by a concurrent request. Please refresh and try again.',
        409,
        'CONCURRENT_MODIFICATION',
      )
    }

    // Append to order history
    await tx.orderHistory.create({
      data: {
        orderId:     id,
        fromStatus:  previousStatus,
        toStatus:    status,
        note:        note ?? null,
        changedById: req.user.id,
      },
    })

    // Handle inventory side-effects
    if (status === 'CONFIRMED' || status === 'CANCELLED') {
      const orderItems = await tx.orderItem.findMany({
        where:  { orderId: id },
        select: { productId: true, quantity: true },
      })
      const inventoryReason = status === 'CONFIRMED' ? 'ORDER_CONFIRMED' : 'ORDER_CANCELLED'
      await applyInventoryChanges(tx, orderItems, inventoryReason, id, req.user.id, previousStatus)
    }

    return tx.order.findUnique({ where: { id }, include: ORDER_INCLUDE })
  })

  writeAuditLog({
    actorId:    req.user.id,
    action:     'STATUS_CHANGE',
    resource:   'order',
    resourceId: id,
    meta:       { from: previousStatus, to: status },
    req,
  }).catch(() => {})

  res.json({ success: true, data: { order: serializeOrder(updated) } })
})

module.exports = { create, list, getById, getHistory, updateStatus, applyInventoryChanges }
