const { Prisma } = require('@prisma/client')
const crypto = require('crypto')
const { prisma } = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { AppError } = require('../utils/AppError.js')
const { hasActiveSubscription } = require('../middleware/requireSubscription.js')
const { createOrderFromQuote } = require('../services/quoteOrderService.js')
const { pickUserCity, mapMaskedParty, USER_PUBLIC_SELECT } = require('../services/sellerProfileService.js')
const { serializeOrder } = require('../utils/serialize.js')
const { allocateRfqNumber } = require('../services/rfqNumberService.js')
const {
  displayRfqRef,
  listGroupedFromRows,
  listGroupedFromRegistry,
  buildComparisonGroup,
  computeBuyerStats,
  computeSellerStats,
} = require('../services/quoteGroupService.js')
const { buildRfqAttachments, UPLOAD_DIR } = require('../middleware/rfqUpload.js')
const { sanitizeDisplayFilename } = require('../utils/rfqFileValidation.js')
const fs = require('fs')
const path = require('path')

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

function rfqRef(requestOrId) {
  if (typeof requestOrId === 'string') {
    return `RFQ-${requestOrId.slice(0, 8).toUpperCase()}`
  }
  return displayRfqRef(requestOrId)
}

function parseAttachments(raw) {
  if (raw == null) return null
  if (!Array.isArray(raw)) return null
  return raw.map((item) => ({
    name: cleanText(item?.name, 255),
    url: cleanText(item?.url, 2000),
    mimeType: cleanText(item?.mimeType, 100),
    sizeBytes: Number.isFinite(Number(item?.sizeBytes)) ? Number(item.sizeBytes) : undefined,
  })).filter((item) => item.name && item.url)
}

function parseExpectedDeliveryDate(raw) {
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date
}

async function resolveSellerIds(body, product) {
  const fromArray = Array.isArray(body.sellerIds)
    ? body.sellerIds.map((id) => cleanText(id, 64)).filter(Boolean)
    : []

  if (fromArray.length) {
    return [...new Set(fromArray)]
  }

  const single = cleanText(body.sellerId, 64)
  if (single) return [single]

  if (product?.sellerId) return [product.sellerId]

  return []
}

async function assertSellersExist(sellerIds) {
  const sellers = await prisma.user.findMany({
    where: { id: { in: sellerIds }, role: 'SELLER' },
    select: { id: true },
  })
  if (sellers.length !== sellerIds.length) {
    throw new AppError('One or more sellerIds are invalid', 400, 'VALIDATION_ERROR')
  }
}

function withPartyMeta(request) {
  return {
    rfqGroupId: request.rfqGroupId,
    rfqNumber: request.rfqNumber,
    sellerId: request.sellerId,
    sellerCity: pickUserCity(request.seller),
    buyerId: request.buyerId,
    buyerCity: pickUserCity(request.buyer),
    deliveryLocation: request.deliveryLocation,
    expectedDeliveryDate: request.expectedDeliveryDate,
    attachments: request.attachments ?? [],
  }
}

function sanitizeQuoteRequestForSeller(request, hasFullAccess) {
  return {
    ...request,
    ...withPartyMeta(request),
    rfqRef: rfqRef(request),
    locked: !hasFullAccess,
    seller: mapMaskedParty(request.seller),
    buyer: mapMaskedParty(request.buyer),
  }
}

function sanitizeQuoteRequestForBuyer(request) {
  return {
    ...request,
    ...withPartyMeta(request),
    rfqRef: rfqRef(request),
    seller: mapMaskedParty(request.seller),
    buyer: mapMaskedParty(request.buyer),
  }
}

function maskQuoteRequestSummary(request) {
  return {
    id: request.id,
    rfqGroupId: request.rfqGroupId,
    rfqNumber: request.rfqNumber,
    rfqRef: rfqRef(request),
    status: request.status,
    createdAt: request.createdAt,
    productTitle: request.productTitle,
    productCategory: request.productCategory,
    brandName: request.brandName,
    quantity: request.quantity,
    deliveryLocation: request.deliveryLocation,
    expectedDeliveryDate: request.expectedDeliveryDate,
    ...withPartyMeta(request),
    locked: true,
    buyerHidden: true,
  }
}

function maskQuoteRequestSummaryForBuyer(request) {
  return {
    id: request.id,
    rfqGroupId: request.rfqGroupId,
    rfqNumber: request.rfqNumber,
    rfqRef: rfqRef(request),
    status: request.status,
    createdAt: request.createdAt,
    productTitle: request.productTitle,
    productCategory: request.productCategory,
    brandName: request.brandName,
    quantity: request.quantity,
    deliveryLocation: request.deliveryLocation,
    expectedDeliveryDate: request.expectedDeliveryDate,
    attachments: request.attachments ?? [],
    ...withPartyMeta(request),
    sellerUnitPrice: request.status === 'RESPONDED' || request.status === 'ACCEPTED'
      ? request.sellerUnitPrice
      : null,
    seller: mapMaskedParty(request.seller),
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
      'An active Buyer subscription is required to request quotations.',
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
  const deliveryLocation = cleanText(req.body.deliveryLocation, 500)
  if (!deliveryLocation) {
    return res.status(400).json({
      success: false,
      error: { message: 'deliveryLocation is required' },
    })
  }

  const expectedDeliveryDate = parseExpectedDeliveryDate(req.body.expectedDeliveryDate)
  if (!expectedDeliveryDate) {
    return res.status(400).json({
      success: false,
      error: { message: 'expectedDeliveryDate must be a valid date' },
    })
  }

  const attachments = parseAttachments(req.body.attachments)
  let productId = cleanText(req.body.productId, 64)
  let product = null

  if (req.body.productId) {
    product = await prisma.product.findUnique({
      where: { id: String(req.body.productId) },
      select: { id: true, sellerId: true, name: true, isActive: true },
    })
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' },
      })
    }
    productId = product.id
  }

  const sellerIds = await resolveSellerIds(req.body, product)
  if (!sellerIds.length) {
    return res.status(400).json({
      success: false,
      error: { message: 'At least one sellerId or sellerIds entry is required' },
    })
  }

  await assertSellersExist(sellerIds)

  if (Array.isArray(req.body.productIds) && req.body.productIds.length > 1) {
    throw new AppError(
      'Multi-product RFQ is not supported yet. This feature belongs to a future release.',
      400,
      'VALIDATION_ERROR',
    )
  }

  const rfqGroupId = crypto.randomUUID()
  const sharedData = {
    rfqGroupId,
    buyerId: req.user.id,
    productId,
    catalogProductId: cleanText(req.body.catalogProductId, 64),
    productTitle,
    productCategory: cleanText(req.body.productCategory, 200),
    brandName: cleanText(req.body.brandName, 200),
    quantity: safeQuantity,
    targetPrice,
    message: cleanText(req.body.message, 1000),
    deliveryLocation,
    expectedDeliveryDate,
    attachments,
  }

  let createdRows
  try {
    createdRows = await prisma.$transaction(async (tx) => {
      const rfqNumber = await allocateRfqNumber(tx)
      await tx.rfqGroup.create({
        data: {
          id: rfqGroupId,
          rfqNumber,
          buyerId: req.user.id,
        },
      })
      const rows = []
      for (const sellerId of sellerIds) {
        const row = await tx.quoteRequest.create({
          data: { ...sharedData, sellerId, rfqNumber },
          include: QUOTE_INCLUDE,
        })
        rows.push(row)
      }
      return rows
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      const target = error?.meta?.target || []
      if (target.includes('rfq_number') || target.includes('rfqNumber')) {
        throw new AppError('RFQ number conflict. Please retry.', 409, 'RFQ_NUMBER_CONFLICT')
      }
      throw new AppError('Duplicate seller in the same RFQ group is not allowed.', 409, 'DUPLICATE_SELLER')
    }
    throw error
  }

  const requests = createdRows.map(sanitizeQuoteRequestForBuyer)

  res.status(201).json({
    success: true,
    data: {
      group: {
        rfqGroupId,
        rfqNumber: createdRows[0]?.rfqNumber,
        rfqRef: rfqRef(createdRows[0]),
        requests,
      },
      request: requests[0],
    },
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
      'An active Seller subscription is required to decline RFQs.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  const existing = await assertSellerCanAccess(req.params.id, req.user)

  if (existing.status === 'ACCEPTED') {
    throw new AppError('This quotation is already accepted', 409, 'CONFLICT')
  }

  if (existing.status === 'DECLINED') {
    throw new AppError('This quotation is already declined', 409, 'CONFLICT')
  }

  if (existing.status !== 'PENDING') {
    throw new AppError('Only pending RFQs can be declined', 400, 'NOT_PENDING')
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

    if (locked.rfqGroupId) {
      const alreadyAccepted = await tx.quoteRequest.findFirst({
        where: {
          rfqGroupId: locked.rfqGroupId,
          buyerId: locked.buyerId,
          status: 'ACCEPTED',
          id: { not: locked.id },
        },
      })
      if (alreadyAccepted) {
        throw new AppError(
          'Another quotation in this RFQ group is already accepted.',
          409,
          'CONFLICT',
        )
      }
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

    let declinedSiblingCount = 0
    if (locked.rfqGroupId) {
      const declined = await tx.quoteRequest.updateMany({
        where: {
          rfqGroupId: locked.rfqGroupId,
          buyerId: locked.buyerId,
          id: { not: locked.id },
          status: { in: ['PENDING', 'RESPONDED'] },
        },
        data: {
          status: 'DECLINED',
          buyerRejectedAt: new Date(),
        },
      })
      declinedSiblingCount = declined.count
    }

    return { order, request: updated, declinedSiblingCount }
  })

  res.json({
    success: true,
    data: {
      request: sanitizeQuoteRequestForBuyer(result.request),
      order: serializeOrder(result.order),
      declinedSiblingCount: result.declinedSiblingCount,
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
      buyer: { select: USER_PUBLIC_SELECT },
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
        buyerCity: pickUserCity(request.buyer),
        confirmedDeals: 0,
        lastConfirmedAt: null,
        rfqs90d: rfqCountByBuyer.get(buyerId) ?? 0,
      })
    }

    const row = byBuyer.get(buyerId)
    row.confirmedDeals += 1
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

const listGroupedRequests = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await userHasBuyerWorkspace(req.user))) {
    throw new AppError('Buyer workspace access required', 403, 'FORBIDDEN')
  }

  const buyerFilter = req.user.role === 'ADMIN' ? {} : { buyerId: req.user.id }
  const registry = await prisma.rfqGroup.findMany({
    where: buyerFilter,
    include: {
      requests: {
        include: QUOTE_INCLUDE,
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const hasFullAccess =
    req.user.role === 'ADMIN' || await hasActiveSubscription(req.user.id, 'BUYER')

  const grouped = listGroupedFromRegistry(registry, req.query)

  if (!hasFullAccess) {
    grouped.items = grouped.items.map((group) => ({
      rfqGroupId: group.rfqGroupId,
      rfqNumber: group.rfqNumber,
      rfqRef: group.rfqRef,
      productTitle: group.productTitle,
      quantity: group.quantity,
      aggregateStatus: group.aggregateStatus,
      sellerCount: group.sellerCount,
      createdAt: group.createdAt,
      locked: true,
    }))
  }

  res.json({
    success: true,
    data: {
      hasFullAccess,
      ...grouped,
    },
  })
})

const getGroupComparison = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await userHasBuyerWorkspace(req.user))) {
    throw new AppError('Buyer workspace access required', 403, 'FORBIDDEN')
  }

  const rfqGroupId = req.params.rfqGroupId
  const registry = await prisma.rfqGroup.findFirst({
    where: req.user.role === 'ADMIN'
      ? { id: rfqGroupId }
      : { id: rfqGroupId, buyerId: req.user.id },
    include: {
      requests: {
        include: QUOTE_INCLUDE,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!registry?.requests?.length) {
    throw new AppError('RFQ group not found', 404, 'NOT_FOUND')
  }

  const hasFullAccess =
    req.user.role === 'ADMIN' || await hasActiveSubscription(req.user.id, 'BUYER')

  const group = buildComparisonGroup(registry.requests)
  if (!hasFullAccess) {
    return res.json({
      success: true,
      data: {
        hasFullAccess: false,
        group: {
          rfqGroupId: group.rfqGroupId,
          rfqNumber: group.rfqNumber,
          productTitle: group.productTitle,
          aggregateStatus: group.aggregateStatus,
          sellerCount: group.sellerCount,
          locked: true,
        },
      },
    })
  }

  res.json({
    success: true,
    data: {
      hasFullAccess: true,
      group,
    },
  })
})

const getStats = asyncHandler(async (req, res) => {
  const view = await resolveQuoteListView(req.user, req.query.viewAs)

  if (view === 'buyer') {
    const rows = await prisma.quoteRequest.findMany({
      where: { buyerId: req.user.id },
      select: {
        id: true,
        rfqGroupId: true,
        status: true,
        quoteValidUntil: true,
      },
    })
    return res.json({
      success: true,
      data: {
        viewAs: 'buyer',
        stats: computeBuyerStats(rows),
      },
    })
  }

  const where =
    req.user.role === 'ADMIN'
      ? {}
      : { sellerId: req.user.id }

  const rows = await prisma.quoteRequest.findMany({
    where,
    select: {
      id: true,
      status: true,
      quoteValidUntil: true,
    },
  })
  res.json({
    success: true,
    data: {
      viewAs: 'seller',
      stats: computeSellerStats(rows),
    },
  })
})

const uploadAttachments = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN' && !(await userHasBuyerWorkspace(req.user))) {
    throw new AppError('Buyer workspace access required', 403, 'FORBIDDEN')
  }

  const attachments = await buildRfqAttachments(req.files || [])
  res.status(201).json({
    success: true,
    data: { attachments },
  })
})

async function userCanAccessRfqAttachment(user, filename) {
  if (user.role === 'ADMIN') return true

  const match = await prisma.$queryRaw`
    SELECT qr.id
    FROM quote_requests qr
    WHERE (qr.buyer_id = ${user.id} OR qr.seller_id = ${user.id})
      AND qr.attachments::text ILIKE ${`%${filename}%`}
    LIMIT 1
  `

  return Array.isArray(match) && match.length > 0
}

const downloadAttachment = asyncHandler(async (req, res) => {
  const filename = sanitizeDisplayFilename(req.params.filename)
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new AppError('Invalid attachment filename', 400, 'VALIDATION_ERROR')
  }

  const allowed = await userCanAccessRfqAttachment(req.user, filename)
  if (!allowed) {
    throw new AppError('You do not have access to this attachment', 403, 'FORBIDDEN')
  }

  const filePath = path.join(UPLOAD_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new AppError('Attachment not found', 404, 'NOT_FOUND')
  }

  res.sendFile(filePath)
})

module.exports = {
  createRequest,
  listRequests,
  listGroupedRequests,
  getGroupComparison,
  getStats,
  uploadAttachments,
  downloadAttachment,
  getById,
  respond,
  sellerReject,
  buyerAccept,
  buyerReject,
  listConfirmedBuyers,
}
