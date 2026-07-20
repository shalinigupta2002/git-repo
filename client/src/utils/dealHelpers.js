/** Shared deal formatting and payment helpers for buyer, seller, and admin UI. */

export const BUYER_LIFECYCLE_STATUS = Object.freeze({
  QUOTATION_ACCEPTED: 'Quotation Accepted',
  ORDER_CREATED: 'Order Created',
  DEAL_CHARGE_PENDING: 'Deal Charge Pending',
  CONTACT_UNLOCKED: 'Contact Unlocked',
  CANCELLED: 'Cancelled',
})

export const BUYER_STATUS_BADGE = Object.freeze({
  QUOTATION_ACCEPTED: 'b2bBadge--blue',
  ORDER_CREATED: 'b2bBadge--blue',
  DEAL_CHARGE_PENDING: 'b2bBadge--amber',
  CONTACT_UNLOCKED: 'b2bBadge--green',
  CANCELLED: 'b2bBadge--grey',
})

export const DEAL_STATUS_LABELS = Object.freeze({
  QUOTATION_ACCEPTED: 'Quotation Accepted',
  DEAL_CREATED: 'Order Created',
  PAYMENT_PENDING: 'Deal Charge Pending',
  ACTIVE: 'Contact Unlocked',
  COMPLETED: 'Contact Unlocked',
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

export const UNLOCKED_INFO_NOTICE = Object.freeze({
  TITLE: 'Contact Details Unlocked',
  DESC: 'Contact details have been unlocked successfully. From this point onward Buyer and Seller will communicate directly. Pricing, logistics, delivery, payment settlement and order execution happen outside the platform. The platform does not monitor or track offline business after contact details are unlocked.',
})

export const PAYMENT_STATUS_BADGE = Object.freeze({
  PENDING: 'b2bBadge--amber',
  SUCCESS: 'b2bBadge--green',
  FAILED: 'b2bBadge--grey',
})

export const TIMELINE_EVENT_LABELS = Object.freeze({
  DEAL_CREATED: 'Order Created',
  CHARGE_CALCULATED: 'Platform Deal Charge Calculated',
  PAYMENT_CREATED: 'Deal Charge Pending',
  PAYMENT_SUCCESS: 'Payment Completed',
  PAYMENT_FAILED: 'Payment Failed',
  STATUS_CHANGED: 'Status Updated',
  CONTACT_UNLOCKED: 'Contact Details Unlocked',
  DEAL_COMPLETED: 'Business Continues Offline',
  ADMIN_OVERRIDE: 'Admin Override',
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
    website: user?.website ?? null,
    businessDescription: user?.businessDescription ?? null,
    addressLine1: address?.line1 ?? user?.addressLine1 ?? null,
    addressLine2: address?.line2 ?? user?.addressLine2 ?? null,
    postalCode: address?.postalCode ?? user?.postalCode ?? null,
  }
}

export function isDealContactUnlocked(deal) {
  if (!deal) return false
  if (deal.contactUnlockStatus === 'UNLOCKED') return true
  const buyerPayment = getDealPayment(deal, 'BUYER')
  const sellerPayment = getDealPayment(deal, 'SELLER')
  return Boolean(
    buyerPayment?.paymentStatus === 'SUCCESS'
    && sellerPayment?.paymentStatus === 'SUCCESS',
  )
}

export function getBuyerVisibleStatus(deal) {
  if (!deal) return 'Unknown'
  if (isDealContactUnlocked(deal)) return 'Contact Unlocked'
  return DEAL_STATUS_LABELS[deal.status] || deal.status || 'Unknown'
}

export function getSellerVisibleStatus(deal) {
  if (!deal) return 'Unknown'
  if (isDealContactUnlocked(deal)) return 'Contact Unlocked'
  return DEAL_STATUS_LABELS[deal.status] || deal.status || 'Unknown'
}

export function getAdminVisibleStatus(deal) {
  if (!deal) return 'Unknown'
  if (isDealContactUnlocked(deal)) return 'Contact Unlocked'
  return DEAL_STATUS_LABELS[deal.status] || deal.status || 'Unknown'
}

export function getRoleVisibleStatus(deal, role = 'BUYER') {
  if (role === 'SELLER') return getSellerVisibleStatus(deal)
  if (role === 'ADMIN') return getAdminVisibleStatus(deal)
  return getBuyerVisibleStatus(deal)
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
