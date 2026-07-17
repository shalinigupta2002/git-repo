'use strict'

const env = require('../config/env.js')

const BUYER_PLANS = new Set(['BUYER_STANDARD', 'BUYER_LIFETIME'])
const SELLER_PLANS = new Set(['SELLER_MONTH', 'SELLER_LIFETIME'])

const ID_PATTERNS = {
  BUYER: {
    production: /^BUY-(\d{6})$/,
    demo: /^BUY-DEMO-(\d{6})$/,
  },
  SELLER: {
    production: /^SEL-(\d{6})$/,
    demo: /^SEL-DEMO-(\d{6})$/,
  },
}

function workspaceForPlan(plan) {
  if (BUYER_PLANS.has(plan)) return 'BUYER'
  if (SELLER_PLANS.has(plan)) return 'SELLER'
  return null
}

function idPrefix(type) {
  if (type === 'BUYER') return env.isProd ? 'BUY' : 'BUY-DEMO'
  return env.isProd ? 'SEL' : 'SEL-DEMO'
}

function formatMarketplaceId(type, sequence) {
  const prefix = idPrefix(type)
  const padded = String(sequence).padStart(6, '0')
  return `${prefix}-${padded}`
}

function parseSequenceFromId(marketplaceId, type) {
  if (!marketplaceId) return 0
  const patterns = ID_PATTERNS[type]
  for (const pattern of [patterns.production, patterns.demo]) {
    const match = marketplaceId.match(pattern)
    if (match) return parseInt(match[1], 10)
  }
  return 0
}

/**
 * Sync counter from the highest existing marketplace ID in users table.
 * Ensures numbering continues after seed data or manual assignments.
 */
async function syncCounterFromExistingIds(client, type) {
  const field = type === 'BUYER' ? 'buyerMarketplaceId' : 'sellerMarketplaceId'
  const users = await client.user.findMany({
    where: { [field]: { not: null } },
    select: { [field]: true },
  })

  let maxSeq = 0
  for (const row of users) {
    maxSeq = Math.max(maxSeq, parseSequenceFromId(row[field], type))
  }

  const existing = await client.marketplaceIdCounter.findUnique({ where: { type } })
  const nextValue = Math.max(maxSeq, existing?.lastValue ?? 0)

  await client.marketplaceIdCounter.upsert({
    where: { type },
    create: { type, lastValue: nextValue },
    update: { lastValue: nextValue },
  })

  return nextValue
}

async function allocateMarketplaceId(client, type) {
  await syncCounterFromExistingIds(client, type)

  const counter = await client.marketplaceIdCounter.upsert({
    where: { type },
    create: { type, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  })

  return formatMarketplaceId(type, counter.lastValue)
}

function subscriptionFieldsForType(type) {
  if (type === 'BUYER') {
    return {
      idField: 'buyerMarketplaceId',
      statusField: 'buyerSubscriptionStatus',
      planField: 'buyerSubscriptionPlan',
      activatedField: 'buyerSubscriptionActivatedAt',
    }
  }
  return {
    idField: 'sellerMarketplaceId',
    statusField: 'sellerSubscriptionStatus',
    planField: 'sellerSubscriptionPlan',
    activatedField: 'sellerSubscriptionActivatedAt',
  }
}

async function ensureIdentityForPlan(client, userId, plan, subscriptionStatus = 'ACTIVE') {
  const type = workspaceForPlan(plan)
  if (!type) return null

  const fields = subscriptionFieldsForType(type)
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      buyerMarketplaceId: true,
      sellerMarketplaceId: true,
      buyerSubscriptionActivatedAt: true,
      sellerSubscriptionActivatedAt: true,
    },
  })
  if (!user) return null

  const existingId = user[fields.idField]
  const now = new Date()

  if (existingId) {
    const updateData = {
      [fields.statusField]: subscriptionStatus,
      [fields.planField]: plan,
    }
    await client.user.update({
      where: { id: userId },
      data: updateData,
    })
    return existingId
  }

  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const newId = await allocateMarketplaceId(client, type)
    try {
      await client.user.update({
        where: { id: userId },
        data: {
          [fields.idField]: newId,
          [fields.statusField]: subscriptionStatus,
          [fields.planField]: plan,
          [fields.activatedField]: now,
        },
      })
      return newId
    } catch (err) {
      if (err.code === 'P2002' && attempt < maxAttempts - 1) {
        continue
      }
      throw err
    }
  }
  return null
}

/**
 * Assign marketplace IDs for all subscription grants after payment verification.
 * Never overwrites an existing ID; renewals reuse the same marketplace ID.
 */
async function ensureIdentityForGrants(client, userId, subscriptions) {
  const results = { buyerMarketplaceId: null, sellerMarketplaceId: null }

  for (const sub of subscriptions) {
    const type = workspaceForPlan(sub.plan)
    if (!type) continue
    const status = sub.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE'
    const id = await ensureIdentityForPlan(client, userId, sub.plan, status)
    if (type === 'BUYER') results.buyerMarketplaceId = id
    if (type === 'SELLER') results.sellerMarketplaceId = id
  }

  return results
}

/**
 * Sync denormalized subscription status/plan from active subscriptions.
 * Marketplace IDs are never modified here.
 */
async function syncDenormalizedSubscriptionFields(client, userId, { hasBuyerSub, hasSellerSub, buyerPlan, sellerPlan }) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      buyerMarketplaceId: true,
      sellerMarketplaceId: true,
    },
  })
  if (!user) return

  const data = {}

  if (user.buyerMarketplaceId) {
    data.buyerSubscriptionStatus = hasBuyerSub ? 'ACTIVE' : 'EXPIRED'
    if (hasBuyerSub && buyerPlan) data.buyerSubscriptionPlan = buyerPlan
  }

  if (user.sellerMarketplaceId) {
    data.sellerSubscriptionStatus = hasSellerSub ? 'ACTIVE' : 'EXPIRED'
    if (hasSellerSub && sellerPlan) data.sellerSubscriptionPlan = sellerPlan
  }

  if (Object.keys(data).length) {
    await client.user.update({ where: { id: userId }, data })
  }
}

module.exports = {
  workspaceForPlan,
  formatMarketplaceId,
  parseSequenceFromId,
  syncCounterFromExistingIds,
  allocateMarketplaceId,
  ensureIdentityForPlan,
  ensureIdentityForGrants,
  syncDenormalizedSubscriptionFields,
  BUYER_PLANS,
  SELLER_PLANS,
}
