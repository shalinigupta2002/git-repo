'use strict'

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { getDealById, listDeals } = require('./dealQueryService.js')

async function listAllDeals(query) {
  return listDeals({
    ...query,
    buyerId: query.buyerId,
    sellerId: query.sellerId,
  })
}

async function getAdminDealById(dealId) {
  return getDealById(dealId)
}

async function listDealChargeConfigs() {
  return prisma.dealChargeConfig.findMany({
    orderBy: [{ audience: 'asc' }, { planKey: 'asc' }],
  })
}

async function updateDealChargeConfig(configId, payload, adminUserId) {
  const existing = await prisma.dealChargeConfig.findUnique({
    where: { id: configId },
  })

  if (!existing) {
    throw new AppError('Deal charge configuration not found.', 404, 'CHARGE_CONFIG_NOT_FOUND')
  }

  const data = { updatedById: adminUserId }

  if (payload.chargeType !== undefined) data.chargeType = payload.chargeType
  if (payload.value !== undefined) {
    data.value = new Prisma.Decimal(payload.value.toString())
  }
  if (payload.currency !== undefined) data.currency = payload.currency
  if (payload.displayName !== undefined) data.displayName = payload.displayName
  if (payload.isActive !== undefined) data.isActive = payload.isActive

  if (data.value != null) {
    const numericValue = Number(data.value.toString())
    if (Number.isNaN(numericValue) || numericValue < 0) {
      throw new AppError('Charge value must be a non-negative number.', 422, 'INVALID_CHARGE_VALUE')
    }
    if ((data.chargeType ?? existing.chargeType) === 'PERCENTAGE' && numericValue > 100) {
      throw new AppError('Percentage charge cannot exceed 100.', 422, 'INVALID_CHARGE_VALUE')
    }
  }

  return prisma.dealChargeConfig.update({
    where: { id: configId },
    data,
  })
}

module.exports = {
  listAllDeals,
  getAdminDealById,
  listDealChargeConfigs,
  updateDealChargeConfig,
}
