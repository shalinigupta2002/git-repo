import { formatProductPrice } from './formatPrice.js'

export const QUOTE_STATUS_LABELS = {
  PENDING: 'PENDING',
  RESPONDED: 'PENDING',
  ACCEPTED: 'QUOTE ACCEPTED',
  DECLINED: 'DECLINED',
  NOT_SELECTED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  DEAL_CLOSED: 'DEAL CLOSED',
}

export const QUOTE_STATUS_BADGE = {
  PENDING: 'b2bBadge--amber',
  RESPONDED: 'b2bBadge--amber',
  ACCEPTED: 'b2bBadge--blue',
  DECLINED: 'b2bBadge--grey',
  NOT_SELECTED: 'b2bBadge--grey',
  CANCELLED: 'b2bBadge--grey',
  EXPIRED: 'b2bBadge--grey',
  DEAL_CLOSED: 'b2bBadge--green',
}

export function areBothDealPaymentsPaid(item) {
  if (!item) return false
  if (item.bothPaid === true || item.dealChargesPaid === true) return true
  const deal = item.deal || (item.payments ? item : null)
  if (!deal) return false

  if (deal.contactUnlockStatus === 'UNLOCKED' || deal.status === 'ACTIVE' || deal.status === 'COMPLETED') {
    return true
  }

  const payments = deal.payments || item.payments
  if (Array.isArray(payments) && payments.length >= 2) {
    const buyerPaid = payments.some((p) => p.payerRole === 'BUYER' && p.paymentStatus === 'SUCCESS')
    const sellerPaid = payments.some((p) => p.payerRole === 'SELLER' && p.paymentStatus === 'SUCCESS')
    return buyerPaid && sellerPaid
  }

  return false
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
  if (!request) return false
  if (typeof request === 'string') return false
  if (request.expired === true) return true
  if (request.status === 'NOT_SELECTED') return true
  if (!request.quoteValidUntil) return false
  return new Date() > new Date(request.quoteValidUntil)
}

export function getQuoteStatusDisplay(requestOrStatus, options = {}) {
  const status = typeof requestOrStatus === 'string' ? requestOrStatus : requestOrStatus?.status
  const item = typeof requestOrStatus === 'object' ? requestOrStatus : (options.item || options.request || null)
  const expired = options.expired ?? (item ? isQuoteExpired(item) : false)

  if (status === 'ACCEPTED') {
    const bothPaid = options.bothPaid ?? areBothDealPaymentsPaid(item)
    if (bothPaid) {
      return { label: 'DEAL CLOSED', badge: 'b2bBadge--green' }
    }
    return { label: 'QUOTE ACCEPTED', badge: 'b2bBadge--blue' }
  }

  if (expired || status === 'EXPIRED' || status === 'NOT_SELECTED') {
    return { label: 'EXPIRED', badge: 'b2bBadge--grey' }
  }

  if (status === 'DECLINED' || status === 'REJECTED') {
    return { label: 'DECLINED', badge: 'b2bBadge--grey' }
  }

  if (status === 'CANCELLED') {
    return { label: 'CANCELLED', badge: 'b2bBadge--grey' }
  }

  return { label: 'PENDING', badge: 'b2bBadge--amber' }
}

export function isBuyerQuotationActionable(request) {
  if (!request || request.actionsLocked) return false
  if (request.status !== 'RESPONDED' && request.status !== 'PENDING') return false
  return !isQuoteExpired(request)
}
