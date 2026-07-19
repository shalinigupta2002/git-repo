'use strict'

const { asyncHandler } = require('../utils/asyncHandler.js')
const { sendSuccess } = require('../utils/apiResponse.js')
const { serializeDeal, serializeDealChargeConfig } = require('../utils/serializeDeal.js')
const {
  listAllDeals,
  getAdminDealById,
  listDealChargeConfigs,
  updateDealChargeConfig,
} = require('../services/dealAdminService.js')

const listDeals = asyncHandler(async (req, res) => {
  const result = await listAllDeals(req.query)

  sendSuccess(res, {
    deals: result.deals.map(serializeDeal),
    pagination: result.pagination,
  })
})

const getDealById = asyncHandler(async (req, res) => {
  const deal = await getAdminDealById(req.params.dealId)
  sendSuccess(res, { deal: serializeDeal(deal) })
})

const listChargeConfigs = asyncHandler(async (req, res) => {
  const configs = await listDealChargeConfigs()
  const { getSubscriberCount, getPendingDealsCount } = require('../services/dealChargeService.js')
  
  const results = []
  for (const c of configs) {
    const serialized = serializeDealChargeConfig(c)
    serialized.subscribersCount = await getSubscriberCount(c.planKey)
    serialized.pendingDealsCount = await getPendingDealsCount(c.id)
    serialized.updatedBy = c.updatedBy ? { email: c.updatedBy.email, companyName: c.updatedBy.companyName } : null
    results.push(serialized)
  }
  
  sendSuccess(res, {
    configs: results,
  })
})

const updateChargeConfig = asyncHandler(async (req, res) => {
  const config = await updateDealChargeConfig(
    req.params.id,
    req.body,
    req.user.id,
  )

  sendSuccess(res, { config: serializeDealChargeConfig(config) })
})

module.exports = {
  listDeals,
  getDealById,
  listChargeConfigs,
  updateChargeConfig,
}
