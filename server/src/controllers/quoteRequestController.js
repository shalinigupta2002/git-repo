const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { AppError } = require('../utils/AppError.js')
const { hasActiveSubscription } = require('../middleware/requireSubscription.js')

function cleanText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, maxLength) : null
}

function rfqRef(id) {
  return `RFQ-${id.slice(0, 8).toUpperCase()}`
}

function buyerDetailsVisible(request, hasFullAccess) {
  return hasFullAccess && request.status === 'ACCEPTED'
}

function sanitizeQuoteRequest(request, hasFullAccess) {
  const revealBuyer = buyerDetailsVisible(request, hasFullAccess)
  const base = {
    ...request,
    rfqRef: rfqRef(request.id),
    locked: !hasFullAccess,
    buyerHidden: !revealBuyer,
  }

  if (!revealBuyer) {
    delete base.buyer
  }

  return base
}

function maskQuoteRequestSummary(request) {
  return {
    id: request.id,
    rfqRef: rfqRef(request.id),
    status: request.status,
    createdAt: request.createdAt,
    productTitle: request.productTitle,
    productCategory: request.productCategory,
    brandName: request.brandName,
    quantity: request.quantity,
    locked: true,
    buyerHidden: true,
  }
}

async function assertSellerCanAccess(requestId, user) {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
  })

  if (!request) {
    throw new AppError('Quote request not found', 404, 'NOT_FOUND')
  }

  if (user.role !== 'ADMIN' && request.sellerId !== user.id) {
    throw new AppError('You do not have access to this quote request', 403, 'FORBIDDEN')
  }

  return request
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

/** GET /api/quote-requests — seller quote inbox (only RFQs for this seller's listings) */
const listRequests = asyncHandler(async (req, res) => {
  const where =
    req.user.role === 'ADMIN'
      ? {}
      : { sellerId: req.user.id }

  const requests = await prisma.quoteRequest.findMany({
    where,
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const hasFullAccess =
    req.user.role === 'ADMIN' ||
    await hasActiveSubscription(req.user.id, 'SELLER')

  const visibleRequests = hasFullAccess
    ? requests.map((request) => sanitizeQuoteRequest(request, true))
    : requests.map(maskQuoteRequestSummary)

  res.json({
    success: true,
    data: {
      hasFullAccess,
      requests: visibleRequests,
      total: visibleRequests.length,
    },
  })
})

/** GET /api/quote-requests/:id — single RFQ detail (buyer identity hidden without subscription) */
const getById = asyncHandler(async (req, res) => {
  const request = await assertSellerCanAccess(req.params.id, req.user)

  const hasFullAccess =
    req.user.role === 'ADMIN' ||
    await hasActiveSubscription(req.user.id, 'SELLER')

  res.json({
    success: true,
    data: {
      hasFullAccess,
      request: sanitizeQuoteRequest(request, hasFullAccess),
    },
  })
})

/** PATCH /api/quote-requests/:id/respond — seller sends formal quote */
const respond = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'SELLER'))) {
    throw new AppError(
      'An active Seller subscription is required to respond with price.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertSellerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED' || existing.status === 'DECLINED') {
    throw new AppError('This quote request is already closed', 409, 'CONFLICT')
  }

  const validUntil = req.body.quoteValidUntil ? new Date(req.body.quoteValidUntil) : null
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    throw new AppError('quoteValidUntil must be a valid date', 400, 'VALIDATION_ERROR')
  }

  const updated = await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: {
      sellerUnitPrice: new Prisma.Decimal(String(req.body.sellerUnitPrice)),
      sellerCurrency: req.body.sellerCurrency || 'INR',
      taxNote: cleanText(req.body.taxNote, 500),
      quoteValidUntil: validUntil,
      freightNote: cleanText(req.body.freightNote, 1000),
      exclusionsNote: cleanText(req.body.exclusionsNote, 1000),
      sellerRespondedAt: new Date(),
      status: 'RESPONDED',
    },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequest(updated, true),
    },
  })
})

/** PATCH /api/quote-requests/:id/accept — seller accepts the RFQ */
const accept = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'SELLER'))) {
    throw new AppError(
      'An active Seller subscription is required to accept a quote.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertSellerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED') {
    throw new AppError('This quote request is already accepted', 409, 'CONFLICT')
  }

  if (existing.status === 'DECLINED') {
    throw new AppError('This quote request was declined', 409, 'CONFLICT')
  }

  if (!existing.sellerUnitPrice) {
    throw new AppError('Respond with price before accepting the quote', 400, 'VALIDATION_ERROR')
  }

  const updated = await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: {
      status: 'ACCEPTED',
      sellerAcceptedAt: new Date(),
    },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequest(updated, true),
    },
  })
})

/** GET /api/quote-requests/confirmed-buyers — buyers revealed after accepted quotes */
const listConfirmedBuyers = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'SELLER'))) {
    throw new AppError(
      'An active Seller subscription is required to view confirmed buyer details.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const sellerFilter =
    req.user.role === 'ADMIN' ? {} : { sellerId: req.user.id }

  const accepted = await prisma.quoteRequest.findMany({
    where: { ...sellerFilter, status: 'ACCEPTED' },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
    },
    orderBy: { sellerAcceptedAt: 'desc' },
  })

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentRfqs = await prisma.quoteRequest.groupBy({
    by: ['buyerId'],
    where: { ...sellerFilter, createdAt: { gte: ninetyDaysAgo } },
    _count: { id: true },
  })
  const rfqCountByBuyer = new Map(
    recentRfqs.map((row) => [row.buyerId, row._count.id]),
  )

  const byBuyer = new Map()
  for (const request of accepted) {
    const buyerId = request.buyerId
    if (!byBuyer.has(buyerId)) {
      byBuyer.set(buyerId, {
        buyerId,
        companyName: request.buyer?.companyName || null,
        email: request.buyer?.email || null,
        confirmedOrders: 0,
        lastConfirmedAt: null,
        rfqs90d: rfqCountByBuyer.get(buyerId) ?? 0,
      })
    }

    const row = byBuyer.get(buyerId)
    row.confirmedOrders += 1
    const confirmedAt = request.sellerAcceptedAt || request.updatedAt
    if (!row.lastConfirmedAt || confirmedAt > row.lastConfirmedAt) {
      row.lastConfirmedAt = confirmedAt
    }
  }

  const buyers = Array.from(byBuyer.values()).sort(
    (a, b) => new Date(b.lastConfirmedAt) - new Date(a.lastConfirmedAt),
  )

  res.json({
    success: true,
    data: {
      buyers,
      total: buyers.length,
    },
  })
})

module.exports = { createRequest, listRequests, getById, respond, accept, listConfirmedBuyers }
