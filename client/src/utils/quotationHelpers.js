import { formatProductPrice } from './formatPrice.js'

export const QUOTE_STATUS_LABELS = {
  PENDING: 'Awaiting quote',
  RESPONDED: 'Quote received',
  ACCEPTED: 'Deal closed',
  DECLINED: 'Declined',
}

export const QUOTE_STATUS_BADGE = {
  PENDING: 'b2bBadge--amber',
  RESPONDED: 'b2bBadge--blue',
  ACCEPTED: 'b2bBadge--green',
  DECLINED: 'b2bBadge--grey',
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
  if (!request?.quoteValidUntil) return false
  return new Date() > new Date(request.quoteValidUntil)
}
