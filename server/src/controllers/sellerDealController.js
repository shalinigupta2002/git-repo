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

  sendSuccess(res, { deal: serializeDeal(deal) })
})

const pay = asyncHandler(async (req, res) => {
  const PaymentProviderFactory = require('../services/payment/PaymentProviderFactory.js')
  const { AppError } = require('../utils/AppError.js')

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

module.exports = { list, getById, pay }
