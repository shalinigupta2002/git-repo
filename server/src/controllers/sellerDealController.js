'use strict'

const { asyncHandler } = require('../utils/asyncHandler.js')
const { sendSuccess } = require('../utils/apiResponse.js')
const { serializeDeal } = require('../utils/serializeDeal.js')
const { listDeals, getDealById } = require('../services/dealQueryService.js')
const {
  assertSellerDealOwnership,
} = require('../services/dealAccessService.js')
const { prisma } = require('../config/database.js')
const { processDealPayment } = require('../services/dealPaymentService.js')
const {
  createDealPaymentOrder,
  verifyDealPayment,
  isRazorpayDealPaymentsAvailable,
} = require('../services/payment/dealRazorpayService.js')
const PaymentProviderFactory = require('../services/payment/PaymentProviderFactory.js')
const { AppError } = require('../utils/AppError.js')

const list = asyncHandler(async (req, res) => {
  const result = await listDeals({
    ...req.query,
    sellerId: req.user.id,
  })

  sendSuccess(res, {
    deals: result.deals.map(serializeDeal),
    pagination: result.pagination,
  })
})

const getById = asyncHandler(async (req, res) => {
  const deal = await getDealById(req.params.dealId)
  assertSellerDealOwnership(req.user, deal)

  sendSuccess(res, {
    deal: serializeDeal(deal),
    paymentProvider: isRazorpayDealPaymentsAvailable() ? 'razorpay' : 'demo',
  })
})

const pay = asyncHandler(async (req, res) => {
  const provider = PaymentProviderFactory.getProvider()
  if (!provider.isAvailable()) {
    throw new AppError(
      'Deal charge payments are not available. Configure a production payment provider.',
      503,
      'PAYMENT_PROVIDER_UNAVAILABLE',
    )
  }

  const deal = await getDealById(req.params.dealId)
  assertSellerDealOwnership(req.user, deal)

  const updated = await processDealPayment(prisma, {
    dealId: deal.id,
    payerRole: 'SELLER',
    actorUserId: req.user.id,
  })

  sendSuccess(res, { deal: serializeDeal(updated) })
})

const createPayOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayDealPaymentsAvailable()) {
    throw new AppError(
      'Razorpay deal payments are not configured.',
      503,
      'RAZORPAY_NOT_CONFIGURED',
    )
  }

  const deal = await getDealById(req.params.dealId)
  assertSellerDealOwnership(req.user, deal)

  const order = await createDealPaymentOrder(prisma, {
    dealId: deal.id,
    payerRole: 'SELLER',
    actorUserId: req.user.id,
  })

  if (order.alreadyPaid) {
    sendSuccess(res, { deal: serializeDeal(order.deal), alreadyPaid: true })
    return
  }

  sendSuccess(res, order)
})

const verifyPay = asyncHandler(async (req, res) => {
  if (!isRazorpayDealPaymentsAvailable()) {
    throw new AppError(
      'Razorpay deal payments are not configured.',
      503,
      'RAZORPAY_NOT_CONFIGURED',
    )
  }

  const deal = await getDealById(req.params.dealId)
  assertSellerDealOwnership(req.user, deal)

  const updated = await verifyDealPayment(prisma, {
    dealId: deal.id,
    payerRole: 'SELLER',
    actorUserId: req.user.id,
    ...req.body,
  })

  sendSuccess(res, { deal: serializeDeal(updated) })
})

module.exports = { list, getById, pay, createPayOrder, verifyPay }
