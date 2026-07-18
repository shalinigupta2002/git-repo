'use strict'

const {
  buildDealContactContext,
  serializeCounterpartyUser,
} = require('../services/counterpartyProfileService.js')

function decimal(value) {
  if (value == null) return null
  return value.toString()
}

function serializeDealPayment(payment) {
  if (!payment) return null
  return {
    id: payment.id,
    payerRole: payment.payerRole,
    payerUserId: payment.payerUserId,
    paymentReference: payment.paymentReference,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId ?? null,
    providerPaymentId: payment.providerPaymentId ?? null,
    paymentStatus: payment.paymentStatus,
    amount: decimal(payment.amount),
    currency: payment.currency,
    paidAt: payment.paidAt ?? null,
    failureReason: payment.failureReason ?? null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  }
}

function serializeDealEvent(event) {
  return {
    id: event.id,
    eventType: event.eventType,
    actorId: event.actorId ?? null,
    payload: event.payload ?? null,
    createdAt: event.createdAt,
  }
}

function serializeDealChargeConfig(config) {
  if (!config) return null
  return {
    id: config.id,
    audience: config.audience,
    planKey: config.planKey,
    displayName: config.displayName ?? null,
    chargeType: config.chargeType,
    value: decimal(config.value),
    currency: config.currency,
    isActive: config.isActive,
    updatedAt: config.updatedAt,
  }
}

function serializeDealParty(user, role, deal) {
  if (!user) return undefined

  const profile = serializeCounterpartyUser(user, role, buildDealContactContext(deal))
  if (!profile) return undefined

  return {
    id: user.id,
    ...profile,
  }
}

function serializeDeal(deal) {
  if (!deal) return null

  return {
    id: deal.id,
    dealNumber: deal.dealNumber,
    quoteRequestId: deal.quoteRequestId,
    rfqGroupId: deal.rfqGroupId ?? null,
    orderId: deal.orderId ?? null,
    buyerId: deal.buyerId,
    sellerId: deal.sellerId,
    product: {
      productId: deal.productId ?? null,
      productName: deal.productName,
      productSku: deal.productSku ?? null,
      productBrand: deal.productBrand ?? null,
      productCategory: deal.productCategory ?? null,
      productUom: deal.productUom ?? null,
      productMoq: deal.productMoq ?? null,
      vendorProductCode: deal.vendorProductCode ?? null,
    },
    quantity: deal.quantity,
    unitPrice: decimal(deal.unitPrice),
    totalAmount: decimal(deal.totalAmount),
    currency: deal.currency,
    status: deal.status,
    buyerDealCharge: decimal(deal.buyerDealCharge),
    sellerDealCharge: decimal(deal.sellerDealCharge),
    buyerChargeConfig: serializeDealChargeConfig(deal.buyerChargeConfig),
    sellerChargeConfig: serializeDealChargeConfig(deal.sellerChargeConfig),
    contactUnlockStatus: deal.contactUnlockStatus,
    contactUnlockedAt: deal.contactUnlockedAt ?? null,
    contactUnlockOverride: deal.contactUnlockOverride,
    completedAt: deal.completedAt ?? null,
    cancelledAt: deal.cancelledAt ?? null,
    disputedAt: deal.disputedAt ?? null,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    payments: (deal.payments ?? []).map(serializeDealPayment),
    events: (deal.events ?? []).map(serializeDealEvent),
    quoteRequest: deal.quoteRequest
      ? {
          id: deal.quoteRequest.id,
          rfqNumber: deal.quoteRequest.rfqNumber ?? null,
          status: deal.quoteRequest.status,
        }
      : undefined,
    buyer: serializeDealParty(deal.buyer, 'BUYER', deal),
    seller: serializeDealParty(deal.seller, 'SELLER', deal),
  }
}

module.exports = {
  serializeDeal,
  serializeDealPayment,
  serializeDealEvent,
  serializeDealChargeConfig,
  serializeDealParty,
}
