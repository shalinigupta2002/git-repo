'use strict'

const { Prisma } = require('@prisma/client')
const { AppError } = require('../utils/AppError.js')
const logger = require('../config/logger.js')
const { allocateDealNumber } = require('./dealNumberService.js')
const { calculateDealCharge } = require('./dealChargeService.js')
const { applyDealTransition } = require('./dealLifecycleService.js')
const { appendDealEvent, DEAL_EVENT_TYPES } = require('./dealEventService.js')
const { createPendingDealPayment } = require('./dealPaymentService.js')

const DEAL_INCLUDE = {
  payments: true,
  events: {
    orderBy: { createdAt: 'asc' },
  },
  buyerChargeConfig: true,
  sellerChargeConfig: true,
}

async function buildProductSnapshot(tx, quote) {
  let product = null
  if (quote.productId) {
    product = await tx.product.findUnique({
      where: { id: quote.productId },
      select: {
        id: true,
        sku: true,
        moq: true,
        name: true,
      },
    })
  }

  if (quote.productId && !product) {
    throw new AppError(
      'Linked product is no longer available for deal creation.',
      404,
      'PRODUCT_UNAVAILABLE',
    )
  }

  const unitPrice = new Prisma.Decimal(quote.sellerUnitPrice.toString())
  const quantity = quote.quantity
  const totalAmount = unitPrice.mul(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)

  return {
    productId: quote.productId ?? null,
    productName: quote.productTitle || product?.name || 'Product',
    productSku: product?.sku ?? null,
    productBrand: quote.brandName ?? null,
    productCategory: quote.productCategory ?? null,
    productUom: 'UNIT',
    productMoq: product?.moq ?? null,
    vendorProductCode: quote.catalogProductId ?? product?.sku ?? null,
    quantity,
    unitPrice,
    totalAmount,
    currency: quote.sellerCurrency || 'INR',
  }
}

function assertQuoteReadyForDeal(quote) {
  if (!quote) {
    throw new AppError('Quotation not found.', 404, 'QUOTE_NOT_FOUND')
  }
  if (quote.status !== 'RESPONDED') {
    throw new AppError(
      'Only responded quotations can create a deal.',
      409,
      'INVALID_QUOTATION',
    )
  }
  if (!quote.sellerId) {
    throw new AppError('Quotation has no assigned seller.', 400, 'NO_SELLER')
  }
  if (quote.sellerUnitPrice == null) {
    throw new AppError('Seller has not provided a unit price.', 400, 'NO_QUOTE_PRICE')
  }
}

/**
 * Create a deal (with charges and pending payments) when buyer accepts a quotation.
 * Must run inside the caller's Prisma transaction.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ quote: object, orderId?: string|null, actorUserId: string }} input
 */
async function createDealFromAcceptedQuote(tx, { quote, orderId = null, actorUserId }) {
  assertQuoteReadyForDeal(quote)

  const existingDeal = await tx.deal.findUnique({
    where: { quoteRequestId: quote.id },
    include: DEAL_INCLUDE,
  })

  if (existingDeal) {
    logger.info(
      { dealId: existingDeal.id, quoteRequestId: quote.id },
      'Deal already exists for quotation — returning existing deal',
    )
    return existingDeal
  }

  try {
    const dealNumber = await allocateDealNumber(tx)
    const snapshot = await buildProductSnapshot(tx, quote)

    const buyerCharge = await calculateDealCharge(tx, {
      userId: quote.buyerId,
      audience: 'BUYER',
      totalAmount: snapshot.totalAmount,
      currency: snapshot.currency,
    })

    const sellerCharge = await calculateDealCharge(tx, {
      userId: quote.sellerId,
      audience: 'SELLER',
      totalAmount: snapshot.totalAmount,
      currency: snapshot.currency,
    })

    let deal = await tx.deal.create({
      data: {
        dealNumber,
        quoteRequestId: quote.id,
        rfqGroupId: quote.rfqGroupId ?? null,
        orderId: orderId ?? null,
        buyerId: quote.buyerId,
        sellerId: quote.sellerId,
        productId: snapshot.productId,
        productName: snapshot.productName,
        productSku: snapshot.productSku,
        productBrand: snapshot.productBrand,
        productCategory: snapshot.productCategory,
        productUom: snapshot.productUom,
        productMoq: snapshot.productMoq,
        vendorProductCode: snapshot.vendorProductCode,
        quantity: snapshot.quantity,
        unitPrice: snapshot.unitPrice,
        totalAmount: snapshot.totalAmount,
        currency: snapshot.currency,
        status: 'QUOTATION_ACCEPTED',
        buyerDealCharge: buyerCharge.amount,
        sellerDealCharge: sellerCharge.amount,
        buyerChargeConfigId: buyerCharge.configId,
        sellerChargeConfigId: sellerCharge.configId,
        contactUnlockStatus: 'LOCKED',
      },
    })

    await appendDealEvent(tx, {
      dealId: deal.id,
      eventType: DEAL_EVENT_TYPES.DEAL_CREATED,
      actorId: actorUserId,
      payload: {
        dealNumber,
        quoteRequestId: quote.id,
        orderId: orderId ?? null,
      },
    })

    await appendDealEvent(tx, {
      dealId: deal.id,
      eventType: DEAL_EVENT_TYPES.CHARGE_CALCULATED,
      actorId: actorUserId,
      payload: {
        buyer: {
          planKey: buyerCharge.planKey,
          chargeType: buyerCharge.chargeType,
          amount: buyerCharge.amount.toString(),
          configId: buyerCharge.configId,
        },
        seller: {
          planKey: sellerCharge.planKey,
          chargeType: sellerCharge.chargeType,
          amount: sellerCharge.amount.toString(),
          configId: sellerCharge.configId,
        },
      },
    })

    deal = await applyDealTransition(tx, deal, 'DEAL_CREATED', actorUserId, 'Deal record initialized')
    deal = await applyDealTransition(tx, deal, 'PAYMENT_PENDING', actorUserId, 'Awaiting buyer and seller deal charges')

    const buyerPayment = await createPendingDealPayment(tx, {
      dealId: deal.id,
      dealNumber,
      payerRole: 'BUYER',
      payerUserId: quote.buyerId,
      amount: buyerCharge.amount,
      currency: buyerCharge.currency,
    })

    await appendDealEvent(tx, {
      dealId: deal.id,
      eventType: DEAL_EVENT_TYPES.PAYMENT_CREATED,
      actorId: actorUserId,
      payload: {
        paymentId: buyerPayment.id,
        payerRole: 'BUYER',
        amount: buyerPayment.amount.toString(),
        paymentReference: buyerPayment.paymentReference,
      },
    })

    const sellerPayment = await createPendingDealPayment(tx, {
      dealId: deal.id,
      dealNumber,
      payerRole: 'SELLER',
      payerUserId: quote.sellerId,
      amount: sellerCharge.amount,
      currency: sellerCharge.currency,
    })

    await appendDealEvent(tx, {
      dealId: deal.id,
      eventType: DEAL_EVENT_TYPES.PAYMENT_CREATED,
      actorId: actorUserId,
      payload: {
        paymentId: sellerPayment.id,
        payerRole: 'SELLER',
        amount: sellerPayment.amount.toString(),
        paymentReference: sellerPayment.paymentReference,
      },
    })

    const completeDeal = await tx.deal.findUnique({
      where: { id: deal.id },
      include: DEAL_INCLUDE,
    })

    logger.info(
      {
        dealId: completeDeal.id,
        dealNumber: completeDeal.dealNumber,
        quoteRequestId: quote.id,
        status: completeDeal.status,
      },
      'Deal created',
    )

    return completeDeal
  } catch (err) {
    logger.error(
      {
        err,
        quoteRequestId: quote.id,
        buyerId: quote.buyerId,
        sellerId: quote.sellerId,
      },
      'Deal creation transaction failed',
    )
    throw err
  }
}

module.exports = {
  DEAL_INCLUDE,
  buildProductSnapshot,
  assertQuoteReadyForDeal,
  createDealFromAcceptedQuote,
}
