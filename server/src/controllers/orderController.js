const crypto = require('crypto')
const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeOrder } = require('../utils/serialize.js')

function generateOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

const create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'BUYER' && req.user.role !== 'ADMIN') {
    throw new AppError('Only buyers can place orders', 403, 'FORBIDDEN')
  }

  const { items, notes } = req.body
  const buyerId = req.user.role === 'ADMIN' ? req.body.buyerId : req.user.id
  if (req.user.role === 'ADMIN' && !req.body.buyerId) {
    throw new AppError('buyerId is required when creating order as admin', 400, 'VALIDATION_ERROR')
  }

  const productIdsRaw = items.map((i) => i.productId)
  if (new Set(productIdsRaw).size !== productIdsRaw.length) {
    throw new AppError(
      'Duplicate product lines — use a single line with the total quantity',
      400,
      'DUPLICATE_LINES',
    )
  }

  const productIds = productIdsRaw
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: {
      id: true,
      sellerId: true,
      price: true,
      moq: true,
      name: true,
    },
  })

  if (products.length !== productIds.length) {
    throw new AppError('One or more products are invalid or inactive', 400, 'INVALID_PRODUCTS')
  }

  const sellerId = products[0].sellerId
  const mixed = products.some((p) => p.sellerId !== sellerId)
  if (mixed) {
    throw new AppError('All line items must be from the same seller', 400, 'SELLER_MISMATCH')
  }

  let total = new Prisma.Decimal(0)
  const lineRows = []

  for (const line of items) {
    const p = products.find((x) => x.id === line.productId)
    if (!p) continue
    if (line.quantity < p.moq) {
      throw new AppError(
        `Quantity for ${p.name} must be at least MOQ (${p.moq})`,
        400,
        'BELOW_MOQ',
      )
    }
    const unitPrice = new Prisma.Decimal(p.price.toString())
    const lineTotal = unitPrice.mul(line.quantity)
    total = total.add(lineTotal)
    lineRows.push({
      productId: p.id,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
    })
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        buyerId,
        sellerId,
        status: 'PENDING',
        totalAmount: total,
        notes: notes ?? null,
        items: {
          create: lineRows,
        },
      },
      include: {
        items: { include: { product: true } },
        buyer: { select: { id: true, email: true, companyName: true } },
        seller: { select: { id: true, email: true, companyName: true } },
      },
    })
    return created
  })

  res.status(201).json({
    success: true,
    data: { order: serializeOrder(order) },
  })
})

const list = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query
  const skip = (page - 1) * limit

  const where = {}
  if (status) where.status = status

  if (req.user.role === 'BUYER') {
    where.buyerId = req.user.id
  } else if (req.user.role === 'SELLER') {
    where.sellerId = req.user.id
  }

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
          },
        },
        buyer: { select: { id: true, email: true, companyName: true } },
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

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true, price: true } },
        },
      },
      buyer: { select: { id: true, email: true, companyName: true } },
      seller: { select: { id: true, email: true, companyName: true } },
    },
  })

  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND')
  }

  const allowed =
    req.user.role === 'ADMIN' ||
    order.buyerId === req.user.id ||
    order.sellerId === req.user.id

  if (!allowed) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  res.json({ success: true, data: { order: serializeOrder(order) } })
})

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND')
  }

  if (req.user.role === 'SELLER' && order.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }
  if (req.user.role === 'BUYER') {
    throw new AppError('Buyers cannot change order status', 403, 'FORBIDDEN')
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
      },
      buyer: { select: { id: true, email: true, companyName: true } },
      seller: { select: { id: true, email: true, companyName: true } },
    },
  })

  res.json({ success: true, data: { order: serializeOrder(updated) } })
})

module.exports = { create, list, getById, updateStatus }
