const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { AppError } = require('../utils/AppError.js')
const { hasActiveSubscription } = require('../middleware/requireSubscription.js')
const { createOrderFromQuote } = require('../services/quoteOrderService.js')
const { pickUserCity, mapPublicUser, USER_PUBLIC_SELECT } = require('../services/sellerProfileService.js')
const { serializeOrder } = require('../utils/serialize.js')

const QUOTE_INCLUDE = {
  buyer: { select: USER_PUBLIC_SELECT },
  seller: { select: USER_PUBLIC_SELECT },
  product: { select: { id: true, name: true, sku: true } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  },
}

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

function sellerVisibleToBuyer(request) {
  return request.status === 'RESPONDED' || request.status === 'ACCEPTED' || request.status === 'DECLINED'
}

function withPartyMeta(request) {
  return {
    sellerId: request.sellerId,
    sellerCity: pickUserCity(request.seller),
    buyerId: request.buyerId,
    buyerCity: pickUserCity(request.buyer),
  }
}

function sanitizeQuoteRequestForSeller(request, hasFullAccess) {
  const revealBuyer = buyerDetailsVisible(request, hasFullAccess)
  const base = {
    ...request,
    ...withPartyMeta(request),
    rfqRef: rfqRef(request.id),
    locked: !hasFullAccess,
    buyerHidden: !revealBuyer,
    seller: mapPublicUser(request.seller),
    buyer: revealBuyer ? mapPublicUser(request.buyer) : undefined,
  }

  if (!revealBuyer) {
    delete base.buyer
  }

  return base
}

function sanitizeQuoteRequestForBuyer(request) {
  return {
    ...request,
    ...withPartyMeta(request),
    rfqRef: rfqRef(request.id),
    sellerHidden: !sellerVisibleToBuyer(request),
    seller: mapPublicUser(request.seller),
    buyer: mapPublicUser(request.buyer),
  }
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
    ...withPartyMeta(request),
    locked: true,
    buyerHidden: true,
  }
}

function maskQuoteRequestSummaryForBuyer(request) {
  return {
    id: request.id,
    rfqRef: rfqRef(request.id),
    status: request.status,
    createdAt: request.createdAt,
    productTitle: request.productTitle,
    productCategory: request.productCategory,
    brandName: request.brandName,
    quantity: request.quantity,
    ...withPartyMeta(request),
    sellerUnitPrice: request.status === 'RESPONDED' || request.status === 'ACCEPTED'
      ? request.sellerUnitPrice
      : null,
    sellerHidden: !sellerVisibleToBuyer(request),
    seller: mapPublicUser(request.seller),
  }
}

async function assertSellerCanAccess(requestId, user) {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    include: QUOTE_INCLUDE,
  })

  if (!request) {
    throw new AppError('Quote request not found', 404, 'NOT_FOUND')
  }

  if (user.role !== 'ADMIN' && request.sellerId !== user.id) {
    throw new AppError('You do not have access to this quote request', 403, 'FORBIDDEN')
  }

  return request
}

async function assertBuyerCanAccess(requestId, user) {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    include: QUOTE_INCLUDE,
  })

  if (!request) {
    throw new AppError('Quote request not found', 404, 'NOT_FOUND')
  }

  if (user.role !== 'ADMIN' && request.buyerId !== user.id) {
    throw new AppError('You do not have access to this quote request', 403, 'FORBIDDEN')
  }

  return request
}

async function userHasBuyerWorkspace(user) {
  if (user.role === 'BUYER') return true
  return hasActiveSubscription(user.id, 'BUYER')
}

async function userHasSellerWorkspace(user) {
  if (user.role === 'SELLER') return true
  return hasActiveSubscription(user.id, 'SELLER')
}

async function resolveQuoteListView(user, viewAs) {
  if (user.role === 'ADMIN') {
    return viewAs === 'buyer' ? 'buyer' : 'seller'
  }
  if (viewAs === 'buyer') {
    if (user.role !== 'ADMIN' && !(await userHasBuyerWorkspace(user))) {
      throw new AppError('Buyer workspace access required', 403, 'FORBIDDEN')
    }
    return 'buyer'
  }
  if (viewAs === 'seller') {
    if (user.role !== 'ADMIN' && !(await userHasSellerWorkspace(user))) {
      throw new AppError('Seller workspace access required', 403, 'FORBIDDEN')
    }
    return 'seller'
  }
  if (user.role === 'BUYER') return 'buyer'
  if (user.role === 'SELLER') return 'seller'
  if (await userHasBuyerWorkspace(user)) return 'buyer'
  if (await userHasSellerWorkspace(user)) return 'seller'
  return 'buyer'
}

const createRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await userHasBuyerWorkspace(req.user))) {
    return res.status(403).json({
      success: false,
      error: { message: 'Buyer workspace access is required to request quotes.' },
    })
  }

  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'BUYER'))) {
    throw new AppError(
      'An active Buyer subscription is required to start negotiations.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
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
  let productId = cleanText(req.body.productId, 64)

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
    productId = product.id
  }

  const request = await prisma.quoteRequest.create({
    data: {
      buyerId: req.user.id,
      sellerId,
      productId,
      catalogProductId: cleanText(req.body.catalogProductId, 64),
      productTitle,
      productCategory: cleanText(req.body.productCategory, 200),
      brandName: cleanText(req.body.brandName, 200),
      quantity: safeQuantity,
      targetPrice,
      message: cleanText(req.body.message, 1000),
    },
    include: QUOTE_INCLUDE,
  })

  res.status(201).json({
    success: true,
    data: { request: sanitizeQuoteRequestForBuyer(request) },
  })
})

const listRequests = asyncHandler(async (req, res) => {
  const view = await resolveQuoteListView(req.user, req.query.viewAs)

  if (view === 'buyer') {
    const requests = await prisma.quoteRequest.findMany({
      where: { buyerId: req.user.id },
      include: QUOTE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const hasFullAccess = req.user.role === 'ADMIN' || await hasActiveSubscription(req.user.id, 'BUYER')

    const visibleRequests = hasFullAccess
      ? requests.map(sanitizeQuoteRequestForBuyer)
      : requests.map(maskQuoteRequestSummaryForBuyer)

    return res.json({
      success: true,
      data: {
        hasFullAccess,
        requests: visibleRequests,
        total: visibleRequests.length,
      },
    })
  }

  const where =
    req.user.role === 'ADMIN'
      ? {}
      : { sellerId: req.user.id }

  const requests = await prisma.quoteRequest.findMany({
    where,
    include: QUOTE_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const hasFullAccess =
    req.user.role === 'ADMIN' ||
    await hasActiveSubscription(req.user.id, 'SELLER')

  const visibleRequests = hasFullAccess
    ? requests.map((request) => sanitizeQuoteRequestForSeller(request, true))
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

const getById = asyncHandler(async (req, res) => {
  const request = await prisma.quoteRequest.findUnique({
    where: { id: req.params.id },
    include: QUOTE_INCLUDE,
  })

  if (!request) {
    throw new AppError('Quote request not found', 404, 'NOT_FOUND')
  }

  const isBuyerParty = request.buyerId === req.user.id
  const isSellerParty = request.sellerId === req.user.id

  if (req.user.role !== 'ADMIN' && !isBuyerParty && !isSellerParty) {
    throw new AppError('You do not have access to this quote request', 403, 'FORBIDDEN')
  }

  if (isBuyerParty) {
    const hasFullAccess =
      req.user.role === 'ADMIN' || await hasActiveSubscription(req.user.id, 'BUYER')

    return res.json({
      success: true,
      data: {
        hasFullAccess,
        request: hasFullAccess
          ? sanitizeQuoteRequestForBuyer(request)
          : maskQuoteRequestSummaryForBuyer(request),
      },
    })
  }

  const hasFullAccess =
    req.user.role === 'ADMIN' ||
    await hasActiveSubscription(req.user.id, 'SELLER')

  res.json({
    success: true,
    data: {
      hasFullAccess,
      request: sanitizeQuoteRequestForSeller(request, hasFullAccess),
    },
  })
})

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
    include: QUOTE_INCLUDE,
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequestForSeller(updated, true),
    },
  })
})

const sellerReject = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'SELLER'))) {
    throw new AppError(
      'An active Seller subscription is required to reject negotiations.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertSellerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED') {
    throw new AppError('This negotiation is already accepted', 409, 'CONFLICT')
  }

  if (existing.status === 'DECLINED') {
    throw new AppError('This negotiation is already declined', 409, 'CONFLICT')
  }

  if (existing.status !== 'PENDING') {
    throw new AppError('Only pending negotiations can be rejected', 400, 'NOT_PENDING')
  }

  const updated = await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: {
      status: 'DECLINED',
      sellerRespondedAt: new Date(),
    },
    include: QUOTE_INCLUDE,
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequestForSeller(updated, true),
    },
  })
})

const buyerAccept = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'BUYER'))) {
    throw new AppError(
      'An active Buyer subscription is required to accept quotes.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertBuyerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED') {
    throw new AppError('This quote is already accepted', 409, 'CONFLICT')
  }

  if (existing.status === 'DECLINED') {
    throw new AppError('This quote was declined', 409, 'CONFLICT')
  }

  if (existing.status !== 'RESPONDED') {
    throw new AppError('Seller must respond with a price before you can accept', 400, 'NOT_RESPONDED')
  }

  if (!existing.sellerUnitPrice) {
    throw new AppError('Seller has not provided a unit price', 400, 'NO_QUOTE_PRICE')
  }

  if (existing.quoteValidUntil && new Date() > new Date(existing.quoteValidUntil)) {
    throw new AppError('This quote has expired', 410, 'QUOTE_EXPIRED')
  }

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.quoteRequest.findUnique({ where: { id: existing.id } })
    if (!locked || locked.status !== 'RESPONDED') {
      throw new AppError('Quote status changed. Please refresh and try again.', 409, 'CONFLICT')
    }

    const order = await createOrderFromQuote(tx, locked, req.user.id)

    const updated = await tx.quoteRequest.update({
      where: { id: locked.id },
      data: {
        status: 'ACCEPTED',
        buyerAcceptedAt: new Date(),
        orderId: order.id,
      },
      include: QUOTE_INCLUDE,
    })

    return { order, request: updated }
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequestForBuyer(result.request),
      order: serializeOrder(result.order),
    },
  })
})

const buyerReject = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await hasActiveSubscription(req.user.id, 'BUYER'))) {
    throw new AppError(
      'An active Buyer subscription is required to reject quotes.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertBuyerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED') {
    throw new AppError('This quote is already accepted', 409, 'CONFLICT')
  }

  if (existing.status === 'DECLINED') {
    throw new AppError('This quote is already declined', 409, 'CONFLICT')
  }

  if (existing.status !== 'RESPONDED') {
    throw new AppError('Only responded quotes can be rejected', 400, 'NOT_RESPONDED')
  }

  const updated = await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: {
      status: 'DECLINED',
      buyerRejectedAt: new Date(),
    },
    include: QUOTE_INCLUDE,
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequestForBuyer(updated),
    },
  })
})

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
    orderBy: { buyerAcceptedAt: 'desc' },
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
    const confirmedAt = request.buyerAcceptedAt || request.updatedAt
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

module.exports = {
  createRequest,
  listRequests,
  getById,
  respond,
  sellerReject,
  buyerAccept,
  buyerReject,
  listConfirmedBuyers,
}
