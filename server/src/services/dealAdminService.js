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
  const { ensureDefaultDealChargeConfigs } = require('./dealChargeService.js')
  await ensureDefaultDealChargeConfigs(prisma)
  return prisma.dealChargeConfig.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ planKey: 'asc' }, { audience: 'asc' }],
    include: {
      updatedBy: { select: { id: true, email: true, companyName: true } }
    }
  })
}

const LEGACY_CHARGE_CONFIG_ALIASES = {
  'setting-lifetime-buyer': { audience: 'BUYER', planKey: 'LIFETIME' },
  'setting-lifetime-seller': { audience: 'SELLER', planKey: 'LIFETIME' },
  'setting-monthly': { audience: 'SELLER', planKey: 'MONTHLY' },
  'setting-annual': { audience: 'BUYER', planKey: 'ANNUAL' },
  'setting-buyer-monthly': { audience: 'BUYER', planKey: 'BUYER_MONTHLY' },
  'setting-buyer-annual': { audience: 'BUYER', planKey: 'BUYER_ANNUAL' },
  'setting-buyer-lifetime': { audience: 'BUYER', planKey: 'BUYER_LIFETIME' },
  'setting-seller-monthly': { audience: 'SELLER', planKey: 'SELLER_MONTHLY' },
  'setting-seller-annual': { audience: 'SELLER', planKey: 'SELLER_ANNUAL' },
  'setting-seller-lifetime': { audience: 'SELLER', planKey: 'SELLER_LIFETIME' },
}

async function resolveDealChargeConfig(configId) {
  const direct = await prisma.dealChargeConfig.findUnique({
    where: { id: configId },
  })
  if (direct) return direct

  const alias = LEGACY_CHARGE_CONFIG_ALIASES[configId]
  if (alias) {
    const byAlias = await prisma.dealChargeConfig.findFirst({ where: alias })
    if (byAlias) return byAlias
  }

  const byPlanKey = await prisma.dealChargeConfig.findFirst({
    where: { planKey: configId },
  })
  if (byPlanKey) return byPlanKey

  const { resolveSubscriptionType } = require('./dealChargeService.js')
  for (const audience of ['BUYER', 'SELLER']) {
    const mappedType = resolveSubscriptionType(configId, audience)
    if (!mappedType) continue
    const byMappedType = await prisma.dealChargeConfig.findFirst({
      where: { audience, planKey: mappedType },
    })
    if (byMappedType) return byMappedType
  }

  return null
}

async function updateDealChargeConfig(configId, payload, adminUserId) {
  const existing = await resolveDealChargeConfig(configId)

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

  const configsToUpdate = [existing]
  if (existing.planKey === 'LIFETIME') {
    const other = await prisma.dealChargeConfig.findFirst({
      where: {
        planKey: 'LIFETIME',
        id: { not: existing.id },
      }
    })
    if (other) configsToUpdate.push(other)
  }

  const updatedConfigs = []
  const { writeAuditLog } = require('../utils/audit.js')

  for (const config of configsToUpdate) {
    const updateData = {
      updatedById: adminUserId,
      value: data.value ?? config.value,
      chargeType: data.chargeType ?? config.chargeType,
      currency: data.currency ?? config.currency,
      displayName: data.displayName ?? config.displayName,
      isActive: data.isActive ?? config.isActive,
    }

    const updated = await prisma.dealChargeConfig.update({
      where: { id: config.id },
      data: updateData,
    })

    await writeAuditLog({
      actorId: adminUserId,
      action: 'UPDATE',
      resource: 'deal_charge_config',
      resourceId: config.id,
      meta: {
        planKey: config.planKey,
        audience: config.audience,
        previousValue: config.value.toString(),
        newValue: updateData.value.toString(),
      }
    })

    updatedConfigs.push(updated)
  }

  return updatedConfigs.find((c) => c.id === existing.id) || updatedConfigs[0]
}

module.exports = {
  listAllDeals,
  getAdminDealById,
  listDealChargeConfigs,
  updateDealChargeConfig,
}
