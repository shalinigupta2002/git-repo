/**
 * Upsert subscribed QA seller accounts (seller2@test.com, seller3@test.com)
 * without purging transactional data.
 *
 * Usage: npm run db:seed:qa-sellers-2-3
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const {
  PASSWORDS,
  PREMIUM_QA_SELLER_2,
  PREMIUM_QA_SELLER_3,
  PREMIUM_SUBSCRIPTION_SPECS,
} = require('./constants.js')
const { upsertPremiumSubscription } = require('./premium.js')

const QA_SELLERS = [PREMIUM_QA_SELLER_2, PREMIUM_QA_SELLER_3]

const prisma = new PrismaClient()

async function upsertQaSeller(spec) {
  const passwordHash = await bcrypt.hash(spec.password, 10)
  const user = await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      role: spec.role,
      companyName: spec.companyName,
      passwordHash,
    },
    create: {
      email: spec.email,
      role: spec.role,
      companyName: spec.companyName,
      passwordHash,
    },
  })

  const label = spec.address.label
  const addressData = {
    line1: spec.address.line1,
    line2: spec.address.line2,
    city: spec.address.city,
    state: spec.address.state,
    postalCode: spec.address.postalCode,
    country: 'IN',
    phone: spec.address.phone,
    isDefault: true,
  }

  const existingAddress = await prisma.address.findFirst({
    where: { userId: user.id, label },
  })

  if (existingAddress) {
    await prisma.address.update({ where: { id: existingAddress.id }, data: addressData })
  } else {
    await prisma.address.create({ data: { userId: user.id, label, ...addressData } })
  }

  const subSpec = PREMIUM_SUBSCRIPTION_SPECS.find((s) => s.email === spec.email)
  if (!subSpec) {
    throw new Error(`Missing subscription spec for ${spec.email}`)
  }

  await upsertPremiumSubscription(prisma, user.id, subSpec, spec)

  const refreshed = await prisma.user.findUnique({ where: { id: user.id } })
  return refreshed
}

async function main() {
  console.log('[qa-sellers] Upserting Test Seller 2 & Test Seller 3…')

  const results = []
  for (const spec of QA_SELLERS) {
    const user = await upsertQaSeller(spec)
    const loginOk = await bcrypt.compare(spec.password, user.passwordHash)
    results.push({ spec, user, loginOk })
  }

  console.log('')
  console.log('=== QA Seller credentials ===')
  for (const { spec, user, loginOk } of results) {
    console.log('')
    console.log(`${spec.companyName}`)
    console.log(`  Email:         ${spec.email}`)
    console.log(`  Password:      ${spec.password}`)
    console.log(`  Seller ID:     ${user.sellerMarketplaceId}`)
    console.log(`  Subscription:  ${user.sellerSubscriptionPlan} (${user.sellerSubscriptionStatus})`)
    console.log(`  Login verify:  ${loginOk ? 'PASS' : 'FAIL'}`)
  }
  console.log('')
  console.log('[qa-sellers] Done')
}

main()
  .catch((err) => {
    console.error('[qa-sellers] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
