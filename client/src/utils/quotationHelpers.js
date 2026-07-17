import { formatProductPrice } from './formatPrice.js'

export const QUOTE_STATUS_LABELS = {
  PENDING: 'Awaiting quote',
  RESPONDED: 'Quote received',
  ACCEPTED: 'Deal closed',
  DECLINED: 'Declined',
  NOT_SELECTED: 'Not selected',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

export const QUOTE_STATUS_BADGE = {
  PENDING: 'b2bBadge--amber',
  RESPONDED: 'b2bBadge--blue',
  ACCEPTED: 'b2bBadge--green',
  DECLINED: 'b2bBadge--grey',
  NOT_SELECTED: 'b2bBadge--grey',
  CANCELLED: 'b2bBadge--grey',
  EXPIRED: 'b2bBadge--grey',
}

export function formatQuoteMoney(value, currency = 'INR') {
  if (value == null || value === '') return '—'
  return formatProductPrice(value, currency)
}

export function formatQuotationDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export function quoteLineTotal(request) {
  const unit = Number(request?.sellerUnitPrice)
  const qty = Number(request?.quantity) || 1
  if (!Number.isFinite(unit)) return null
  return unit * qty
}

export function isQuoteExpired(request) {
  if (request?.expired === true) return true
  if (request?.status === 'NOT_SELECTED') return true
  if (!request?.quoteValidUntil) return false
  return new Date() > new Date(request.quoteValidUntil)
}

export function getQuoteStatusDisplay(status, { expired = false, mode = 'buyer' } = {}) {
  if (mode === 'buyer' && (expired || status === 'NOT_SELECTED' || status === 'EXPIRED')) {
    return { label: QUOTE_STATUS_LABELS.EXPIRED, badge: QUOTE_STATUS_BADGE.EXPIRED }
  }
  if (mode === 'seller' && status === 'NOT_SELECTED') {
    return { label: QUOTE_STATUS_LABELS.NOT_SELECTED, badge: QUOTE_STATUS_BADGE.NOT_SELECTED }
  }
  if (expired && status === 'RESPONDED') {
    return { label: QUOTE_STATUS_LABELS.EXPIRED, badge: QUOTE_STATUS_BADGE.EXPIRED }
  }
  return {
    label: QUOTE_STATUS_LABELS[status] || status,
    badge: QUOTE_STATUS_BADGE[status] || 'b2bBadge--grey',
  }
}

export function isBuyerQuotationActionable(request) {
  if (!request || request.actionsLocked) return false
  if (request.status !== 'RESPONDED' && request.status !== 'PENDING') return false
  return !isQuoteExpired(request)
}
