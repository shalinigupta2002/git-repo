const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeProduct } = require('../utils/serialize.js')

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
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: { id: true, email: true, companyName: true },
        },
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
    where: { id },
    include: {
      seller: {
        select: { id: true, email: true, companyName: true },
      },
    },
  })

  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  const canSeeInactive =
    req.user?.role === 'ADMIN' ||
    (req.user?.role === 'SELLER' && req.user.id === product.sellerId)

  if (!product.isActive && !canSeeInactive) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  res.json({ success: true, data: { product: serializeProduct(product) } })
})

const create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN') {
    throw new AppError('Only sellers can create products', 403, 'FORBIDDEN')
  }

  let sellerId = req.user.id
  if (req.user.role === 'ADMIN') {
    if (!req.body.sellerId) {
      throw new AppError('sellerId is required when creating as admin', 400, 'VALIDATION_ERROR')
    }
    sellerId = req.body.sellerId
  }

  const { sku, name, description, price, moq, currency, isActive } = req.body

  try {
    const product = await prisma.product.create({
      data: {
        sellerId,
        sku,
        name,
        description: description ?? null,
        price: new Prisma.Decimal(String(price)),
        moq: moq ?? 1,
        currency: currency || 'INR',
        isActive: isActive !== false,
      },
      include: {
        seller: {
          select: { id: true, email: true, companyName: true },
        },
      },
    })
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
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }

  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const { sku, name, description, price, moq, currency, isActive } = req.body

  const data = {}
  if (sku !== undefined) data.sku = sku
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = new Prisma.Decimal(String(price))
  if (moq !== undefined) data.moq = moq
  if (currency !== undefined) data.currency = currency
  if (isActive !== undefined) data.isActive = isActive

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400, 'VALIDATION_ERROR')
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        seller: {
          select: { id: true, email: true, companyName: true },
        },
      },
    })
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
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND')
  }
  if (req.user.role !== 'ADMIN' && product.sellerId !== req.user.id) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  await prisma.product.delete({ where: { id } })
  res.status(204).send()
})

module.exports = { list, getById, create, update, remove }
