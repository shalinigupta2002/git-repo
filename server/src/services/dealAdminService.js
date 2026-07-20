'use strict'

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { getDealById, listDeals } = require('./dealQueryService.js')
const { PUBLIC_DEAL_CHARGE_PLAN_KEYS } = require('./dealChargeService.js')
const { resolveCanonicalPlanKey } = require('./subscriptionMasterService.js')

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
  const configs = await prisma.dealChargeConfig.findMany({
    where: {
      isActive: true,
      planKey: { in: [...PUBLIC_DEAL_CHARGE_PLAN_KEYS] },
    },
    orderBy: [{ planKey: 'asc' }, { audience: 'asc' }],
    include: {
      updatedBy: { select: { id: true, email: true, companyName: true } },
    },
  })

  const order = new Map(PUBLIC_DEAL_CHARGE_PLAN_KEYS.map((key, index) => [key, index]))
  return configs.sort((a, b) => (order.get(a.planKey) ?? 99) - (order.get(b.planKey) ?? 99))
}

const LEGACY_CHARGE_CONFIG_ALIASES = {
  'setting-lifetime-buyer': 'BUYER_LIFETIME',
  'setting-lifetime-seller': 'SELLER_LIFETIME',
  'setting-monthly': 'SELLER_MONTHLY',
  'setting-annual': 'BUYER_ANNUAL',
  'setting-buyer-monthly': 'BUYER_MONTHLY',
  'setting-buyer-annual': 'BUYER_ANNUAL',
  'setting-buyer-lifetime': 'BUYER_LIFETIME',
  'setting-seller-monthly': 'SELLER_MONTHLY',
  'setting-seller-annual': 'SELLER_ANNUAL',
  'setting-seller-lifetime': 'SELLER_LIFETIME',
  'setting-both-monthly': 'BOTH_MONTHLY',
  'setting-both-annual': 'BOTH_ANNUAL',
  'setting-both-lifetime': 'BOTH_LIFETIME',
}

async function resolveDealChargeConfig(configId) {
  const direct = await prisma.dealChargeConfig.findUnique({
    where: { id: configId },
  })
  if (direct) return direct

  const aliasPlanKey = LEGACY_CHARGE_CONFIG_ALIASES[configId]
  const canonical = resolveCanonicalPlanKey(aliasPlanKey || configId)

  const byPlanKey = await prisma.dealChargeConfig.findFirst({
    where: {
      planKey: canonical,
      isActive: true,
    },
  })
  if (byPlanKey) return byPlanKey

  return null
}

async function updateDealChargeConfig(configId, payload, adminUserId) {
  const existing = await resolveDealChargeConfig(configId)

  if (!existing) {
    throw new AppError('Deal charge configuration not found.', 404, 'CHARGE_CONFIG_NOT_FOUND')
  }

  if (!PUBLIC_DEAL_CHARGE_PLAN_KEYS.includes(existing.planKey)) {
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

  const updateData = {
    updatedById: adminUserId,
    value: data.value ?? existing.value,
    chargeType: data.chargeType ?? existing.chargeType,
    currency: data.currency ?? existing.currency,
    displayName: data.displayName ?? existing.displayName,
    isActive: data.isActive ?? existing.isActive,
  }

  const updated = await prisma.dealChargeConfig.update({
    where: { id: existing.id },
    data: updateData,
  })

  const { writeAuditLog } = require('../utils/audit.js')
  await writeAuditLog({
    actorId: adminUserId,
    action: 'UPDATE',
    resource: 'deal_charge_config',
    resourceId: existing.id,
    meta: {
      planKey: existing.planKey,
      audience: existing.audience,
      previousValue: existing.value.toString(),
      newValue: updateData.value.toString(),
    },
  })

  return updated
}

module.exports = {
  listAllDeals,
  getAdminDealById,
  listDealChargeConfigs,
  updateDealChargeConfig,
}
