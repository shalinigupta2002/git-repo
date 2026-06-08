const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')

function cleanText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, maxLength) : null
}

/** POST /api/quote-requests — buyer requests a quote for a browsed product */
const createRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== 'BUYER') {
    return res.status(403).json({
      success: false,
      error: { message: 'Only buyer accounts can request quotes.' },
    })
  }

  const productTitle = cleanText(req.body.productTitle, 300)
  if (!productTitle) {
    return res.status(400).json({
      success: false,
      error: { message: 'productTitle is required' },
    })
  }

  const quantity = Number.parseInt(req.body.quantity, 10)
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 100000) : 1
  const targetPrice = req.body.targetPrice == null || req.body.targetPrice === ''
    ? null
    : new Prisma.Decimal(String(req.body.targetPrice))
  let sellerId = cleanText(req.body.sellerId, 64)

  if (req.body.productId) {
    const product = await prisma.product.findUnique({
      where: { id: String(req.body.productId) },
      select: { id: true, sellerId: true, name: true, isActive: true },
    })
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' },
      })
    }
    sellerId = product.sellerId
  }

  const request = await prisma.quoteRequest.create({
    data: {
      buyerId: req.user.id,
      sellerId,
      catalogProductId: cleanText(req.body.catalogProductId, 64),
      productTitle,
      productCategory: cleanText(req.body.productCategory, 200),
      brandName: cleanText(req.body.brandName, 200),
      quantity: safeQuantity,
      targetPrice,
      message: cleanText(req.body.message, 1000),
    },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
  })

  res.status(201).json({ success: true, data: { request } })
})

/** GET /api/quote-requests — seller quote inbox */
const listRequests = asyncHandler(async (req, res) => {
  const where =
    req.user.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { sellerId: req.user.id },
            { sellerId: null },
          ],
        }

  const requests = await prisma.quoteRequest.findMany({
    where,
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  res.json({ success: true, data: { requests } })
})

module.exports = { createRequest, listRequests }
