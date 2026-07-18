'use strict'

const { asyncHandler } = require('../utils/asyncHandler.js')
const {
  assertBuyerDealCapability,
  assertSellerDealCapability,
} = require('../services/dealAccessService.js')

const requireBuyerDealCapability = asyncHandler(async (req, res, next) => {
  await assertBuyerDealCapability(req.user)
  next()
})

const requireSellerDealCapability = asyncHandler(async (req, res, next) => {
  await assertSellerDealCapability(req.user)
  next()
})

module.exports = {
  requireBuyerDealCapability,
  requireSellerDealCapability,
}
