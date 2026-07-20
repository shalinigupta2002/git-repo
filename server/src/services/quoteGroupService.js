'use strict'

const { mapMaskedParty } = require('./sellerProfileService.js')

const PRE_DEAL_PRIVACY = { dealAccepted: false, dealChargesPaid: false }

function groupKey(request) {
  return request.rfqGroupId || request.id
}

function displayRfqRef(request) {
  if (request.rfqNumber) return request.rfqNumber
  return `RFQ-${request.id.slice(0, 8).toUpperCase()}`
}

function isQuotationExpired(request, now = new Date()) {
  if (request.status !== 'RESPONDED') return false
  if (!request.quoteValidUntil) return false
  return new Date(request.quoteValidUntil) < now
}

function isBuyerQuotationExpired(request, now = new Date()) {
  if (request.status === 'NOT_SELECTED') return true
  return isQuotationExpired(request, now)
}

function serializeAttachmentList(attachments) {
  if (!attachments) return []
  if (Array.isArray(attachments)) return attachments
  return []
}

function buildQuotationSummary(request, { maskSeller = true, buyerView = false } = {}) {
  const sellerParty = maskSeller && request.seller
    ? mapMaskedParty(request.seller, 'SELLER', PRE_DEAL_PRIVACY)
    : undefined

  const expired = buyerView
    ? isBuyerQuotationExpired(request)
    : isQuotationExpired(request)

  return {
    id: request.id,
    status: request.status,
    sellerPortalUserId: sellerParty?.portalUserId ?? null,
    sellerCity: sellerParty?.city ?? null,
    seller: sellerParty,
    /** @deprecated Transition alias */
    sellerMarketplaceId: sellerParty?.portalUserId ?? sellerParty?.marketplaceId ?? null,
    sellerUnitPrice: request.status === 'RESPONDED' || request.status === 'ACCEPTED'
      ? request.sellerUnitPrice
      : null,
    sellerCurrency: request.sellerCurrency,
    quoteValidUntil: request.quoteValidUntil,
    freightNote: request.freightNote,
    exclusionsNote: request.exclusionsNote,
    taxNote: request.taxNote,
    sellerRespondedAt: request.sellerRespondedAt,
    buyerAcceptedAt: request.buyerAcceptedAt,
    buyerRejectedAt: request.buyerRejectedAt,
    orderId: request.orderId,
    order: request.order ?? undefined,
    expired,
    actionsLocked: buyerView && (expired || request.status === 'NOT_SELECTED'),
    buyerDisplayStatus: buyerView && request.status === 'NOT_SELECTED' ? 'EXPIRED' : request.status,
  }
}

function buildRfqGroupFromRows(rows, { maskSeller = true, buyerView = false } = {}) {
  if (!rows.length) return null
  const head = rows[0]
  const rfqGroupId = head.rfqGroupId || head.id
  const quotations = rows.map((row) => buildQuotationSummary(row, { maskSeller, buyerView }))

  const statuses = rows.map((r) => r.status)
  let aggregateStatus = 'PENDING'
  if (statuses.includes('ACCEPTED')) aggregateStatus = 'ACCEPTED'
  else if (statuses.every((s) => s === 'DECLINED' || s === 'CANCELLED')) {
    aggregateStatus = statuses.every((s) => s === 'CANCELLED') ? 'CANCELLED' : 'DECLINED'
  }
  else if (statuses.includes('RESPONDED')) aggregateStatus = 'RESPONDED'
  else if (statuses.includes('CANCELLED')) aggregateStatus = 'CANCELLED'

  const hasExpired = quotations.some((q) => q.expired)

  return {
    rfqGroupId,
    rfqNumber: displayRfqRef(head),
    rfqRef: displayRfqRef(head),
    productTitle: head.productTitle,
    productCategory: head.productCategory,
    brandName: head.brandName,
    productId: head.productId,
    catalogProductId: head.catalogProductId,
    quantity: head.quantity,
    targetPrice: head.targetPrice,
    message: head.message,
    deliveryLocation: head.deliveryLocation,
    expectedDeliveryDate: head.expectedDeliveryDate,
    attachments: serializeAttachmentList(head.attachments),
    createdAt: head.createdAt,
    updatedAt: rows.reduce((latest, row) => (
      row.updatedAt > latest ? row.updatedAt : latest
    ), head.updatedAt),
    aggregateStatus,
    hasExpiredQuotation: hasExpired,
    sellerCount: rows.length,
    quotations,
  }
}

function groupRowsByRfq(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = groupKey(row)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return map
}

function groupMatchesStatusFilter(group, status) {
  if (!status || status === 'all') return true

  const quotations = group.quotations || []
  const statuses = quotations.map((q) => q.status)

  switch (status) {
    case 'PENDING':
      return group.aggregateStatus === 'PENDING'
        || statuses.some((s) => s === 'PENDING')
    case 'RESPONDED':
      return group.aggregateStatus === 'RESPONDED'
        || statuses.some((s) => s === 'RESPONDED')
    case 'ACCEPTED':
      return group.aggregateStatus === 'ACCEPTED'
        || statuses.some((s) => s === 'ACCEPTED')
    case 'DECLINED':
      return group.aggregateStatus === 'DECLINED'
        || statuses.some((s) => s === 'DECLINED')
    case 'CANCELLED':
      return group.aggregateStatus === 'CANCELLED'
        || statuses.some((s) => s === 'CANCELLED')
    default:
      return group.aggregateStatus === status
  }
}

function filterGroups(groups, { status, q, expired } = {}) {
  let result = groups

  if (expired === true || expired === 'true') {
    result = result.filter((g) => g.hasExpiredQuotation)
  } else if (status && status !== 'all') {
    result = result.filter((g) => groupMatchesStatusFilter(g, status))
  }

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase()
    result = result.filter((g) => {
      const haystack = [
        g.productTitle,
        g.rfqNumber,
        g.productCategory,
        g.brandName,
        g.deliveryLocation,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }

  return result
}

function paginate(items, page = 1, limit = 20) {
  const safePage = Math.max(Number.parseInt(String(page), 10) || 1, 1)
  const safeLimit = Math.min(Math.max(Number.parseInt(String(limit), 10) || 20, 1), 100)
  const skip = (safePage - 1) * safeLimit
  const slice = items.slice(skip, skip + safeLimit)
  return {
    items: slice,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.ceil(items.length / safeLimit) || 0,
    },
  }
}

function listGroupedFromRows(rows, filters = {}) {
  const grouped = groupRowsByRfq(rows)
  const groups = [...grouped.values()]
    .map((groupRows) => buildRfqGroupFromRows(groupRows, { maskSeller: true, buyerView: true }))
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const filtered = filterGroups(groups, filters)
  return paginate(filtered, filters.page, filters.limit)
}

function buildComparisonGroup(rows) {
  const group = buildRfqGroupFromRows(rows, { maskSeller: true, buyerView: true })
  if (!group) return null

  return {
    ...group,
    comparison: group.quotations.map((q) => ({
      quotationId: q.id,
      sellerMarketplaceId: q.sellerMarketplaceId,
      sellerCity: q.sellerCity,
      status: q.status,
      buyerDisplayStatus: q.buyerDisplayStatus,
      expired: q.expired,
      actionsLocked: q.actionsLocked,
      finalUnitPrice: q.sellerUnitPrice,
      currency: q.sellerCurrency || 'INR',
      deliveryTime: q.freightNote,
      validity: q.quoteValidUntil,
      remarks: q.exclusionsNote,
      taxNote: q.taxNote,
      respondedAt: q.sellerRespondedAt,
    })),
  }
}

function computeBuyerStats(rows, now = new Date()) {
  const groups = [...groupRowsByRfq(rows).values()].map((g) => buildRfqGroupFromRows(g, { buyerView: true }))
  return {
    myRfqs: groups.length,
    pending: groups.filter((g) => g.aggregateStatus === 'PENDING').length,
    sellerResponses: groups.filter((g) => g.aggregateStatus === 'RESPONDED' || g.quotations.some((q) => q.status === 'RESPONDED')).length,
    accepted: groups.filter((g) => g.aggregateStatus === 'ACCEPTED').length,
    rejected: groups.filter((g) => g.aggregateStatus === 'DECLINED').length,
    cancelled: groups.filter((g) => g.aggregateStatus === 'CANCELLED').length,
    expired: groups.filter((g) => g.hasExpiredQuotation).length,
    totalQuotations: rows.length,
  }
}

function computeSellerStats(rows, now = new Date()) {
  return {
    incoming: rows.length,
    pendingResponses: rows.filter((r) => r.status === 'PENDING').length,
    responded: rows.filter((r) => r.status === 'RESPONDED').length,
    acceptedDeals: rows.filter((r) => r.status === 'ACCEPTED').length,
    rejected: rows.filter((r) => r.status === 'DECLINED').length,
    notSelected: rows.filter((r) => r.status === 'NOT_SELECTED').length,
    cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
    expired: rows.filter((r) => isQuotationExpired(r, now)).length,
  }
}

function listGroupedFromRegistry(registry, filters = {}) {
  const items = registry
    .map((entry) => buildRfqGroupFromRows(entry.requests, { maskSeller: true, buyerView: true }))
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const filtered = filterGroups(items, filters)
  return paginate(filtered, filters.page, filters.limit)
}

function filterSellerRows(rows, { status, q, expired } = {}) {
  let result = rows

  if (status && status !== 'all') {
    result = result.filter((row) => row.status === status)
  }

  if (expired === true || expired === 'true') {
    result = result.filter((row) => isQuotationExpired(row))
  }

  if (q && String(q).trim()) {
    const needle = String(q).trim().toLowerCase()
    result = result.filter((row) => {
      const haystack = [
        row.productTitle,
        row.rfqNumber,
        row.deliveryLocation,
        row.productCategory,
        row.brandName,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }

  return result
}

module.exports = {
  groupKey,
  displayRfqRef,
  isQuotationExpired,
  isBuyerQuotationExpired,
  buildRfqGroupFromRows,
  buildComparisonGroup,
  listGroupedFromRows,
  listGroupedFromRegistry,
  computeBuyerStats,
  computeSellerStats,
  buildQuotationSummary,
  filterSellerRows,
  paginate,
}
