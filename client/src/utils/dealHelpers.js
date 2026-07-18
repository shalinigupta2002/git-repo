/** Shared deal formatting and payment helpers for buyer, seller, and admin UI. */

export const DEAL_STATUS_LABELS = Object.freeze({
  QUOTATION_ACCEPTED: 'Quotation accepted',
  DEAL_CREATED: 'Deal created',
  PAYMENT_PENDING: 'Payment pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
})

export const DEAL_STATUS_BADGE = Object.freeze({
  QUOTATION_ACCEPTED: 'b2bBadge--blue',
  DEAL_CREATED: 'b2bBadge--blue',
  PAYMENT_PENDING: 'b2bBadge--amber',
  ACTIVE: 'b2bBadge--green',
  COMPLETED: 'b2bBadge--green',
  CANCELLED: 'b2bBadge--grey',
  DISPUTED: 'b2bBadge--amber',
})

export const PAYMENT_STATUS_BADGE = Object.freeze({
  PENDING: 'b2bBadge--amber',
  SUCCESS: 'b2bBadge--green',
  FAILED: 'b2bBadge--grey',
})

export const TIMELINE_EVENT_LABELS = Object.freeze({
  DEAL_CREATED: 'Deal created',
  CHARGE_CALCULATED: 'Deal charges calculated',
  PAYMENT_CREATED: 'Payment pending',
  PAYMENT_SUCCESS: 'Payment received',
  PAYMENT_FAILED: 'Payment failed',
  STATUS_CHANGED: 'Status updated',
  CONTACT_UNLOCKED: 'Contact unlocked',
  DEAL_COMPLETED: 'Deal completed',
  ADMIN_OVERRIDE: 'Admin override',
})

export const DEAL_SORT_OPTIONS = Object.freeze([
  { value: 'createdAt', label: 'Created date' },
  { value: 'updatedAt', label: 'Updated date' },
  { value: 'dealNumber', label: 'Deal number' },
  { value: 'status', label: 'Status' },
  { value: 'totalAmount', label: 'Amount' },
])

export function formatDealAmount(value, currency = 'INR') {
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value ?? '—')
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(2)}`
  }
}

export function formatDealDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDealPayment(deal, payerRole) {
  return deal?.payments?.find((row) => row.payerRole === payerRole) ?? null
}

export function getMyDealCharge(deal, viewerRole) {
  return viewerRole === 'BUYER' ? deal?.buyerDealCharge : deal?.sellerDealCharge
}

export function getCounterparty(deal, viewerRole) {
  return viewerRole === 'BUYER' ? deal?.seller : deal?.buyer
}

export function getCounterpartyRole(viewerRole) {
  return viewerRole === 'BUYER' ? 'SELLER' : 'BUYER'
}

export function getCounterpartyCity(user) {
  if (user?.city) return user.city
  const address = user?.addresses?.[0]
  return address?.city ?? null
}

export function buildCounterpartyProfile(user) {
  const address = user?.addresses?.[0]
  return {
    portalUserId: user?.portalUserId ?? null,
    city: getCounterpartyCity(user),
    state: address?.state ?? user?.state ?? null,
    companyName: user?.companyName ?? null,
    contactPerson: user?.contactPerson ?? null,
    phone: address?.phone ?? user?.phone ?? null,
    email: user?.email ?? null,
    gst: user?.gst ?? null,
    addressLine1: address?.line1 ?? user?.addressLine1 ?? null,
    addressLine2: address?.line2 ?? user?.addressLine2 ?? null,
    postalCode: address?.postalCode ?? user?.postalCode ?? null,
  }
}

export function isDealContactUnlocked(deal) {
  return deal?.contactUnlockStatus === 'UNLOCKED'
}

export function canPayDealCharge(deal, viewerRole) {
  const payment = getDealPayment(deal, viewerRole)
  return Boolean(
    payment
    && payment.paymentStatus === 'PENDING'
    && deal?.status !== 'CANCELLED'
    && deal?.status !== 'COMPLETED',
  )
}

export function isWaitingForCounterpartyPayment(deal, viewerRole) {
  const myPayment = getDealPayment(deal, viewerRole)
  const theirRole = getCounterpartyRole(viewerRole)
  const theirPayment = getDealPayment(deal, theirRole)
  return (
    myPayment?.paymentStatus === 'SUCCESS'
    && theirPayment?.paymentStatus !== 'SUCCESS'
    && !isDealContactUnlocked(deal)
  )
}

export function describeTimelineEvent(event) {
  if (!event) return { label: 'Event', detail: '' }

  const base = TIMELINE_EVENT_LABELS[event.eventType] || event.eventType
  const payload = event.payload

  if (event.eventType === 'PAYMENT_CREATED' && payload?.payerRole) {
    return {
      label: `${payload.payerRole === 'BUYER' ? 'Buyer' : 'Seller'} payment pending`,
      detail: payload.amount ? formatDealAmount(payload.amount, payload.currency) : '',
    }
  }

  if (event.eventType === 'PAYMENT_SUCCESS' && payload?.payerRole) {
    return {
      label: `${payload.payerRole === 'BUYER' ? 'Buyer' : 'Seller'} paid`,
      detail: payload.amount ? formatDealAmount(payload.amount, payload.currency) : '',
    }
  }

  if (event.eventType === 'STATUS_CHANGED' && payload?.toStatus) {
    return {
      label: DEAL_STATUS_LABELS[payload.toStatus] || payload.toStatus,
      detail: payload.fromStatus ? `From ${payload.fromStatus}` : '',
    }
  }

  return { label: base, detail: '' }
}

export function sortTimelineEvents(events = []) {
  return [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function buildDealListParams(filters = {}) {
  const params = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    sortBy: filters.sortBy ?? 'createdAt',
    sortOrder: filters.sortOrder ?? 'desc',
  }

  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.status) params.status = filters.status
  if (filters.fromDate) params.fromDate = filters.fromDate
  if (filters.toDate) params.toDate = filters.toDate
  if (filters.buyerId?.trim()) params.buyerId = filters.buyerId.trim()
  if (filters.sellerId?.trim()) params.sellerId = filters.sellerId.trim()

  return params
}
