/**
 * UAT cleanup — remove all demo business data while preserving demo login accounts,
 * marketplace IDs, addresses (cities), subscriptions, and master catalog taxonomy.
 *
 * Usage: npm run db:uat-cleanup
 *
 * Production requires ALLOW_PRODUCTION_RESET=true.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const { PrismaClient } = require('@prisma/client')
const { LOGIN_EMAILS } = require('./constants.js')
const { runUatCleanup } = require('./cleanup.js')
const { assertCleanupAllowed } = require('./env.js')

const prisma = new PrismaClient()

function printCounts(label, counts) {
  console.log(`  products:              ${counts.products}`)
  console.log(`  inventory_logs:        ${counts.inventoryLogs}`)
  console.log(`  orders / items:        ${counts.orders} / ${counts.orderItems}`)
  console.log(`  order_history:         ${counts.orderHistory}`)
  console.log(`  rfq_groups:            ${counts.rfqGroups}`)
  console.log(`  quote_requests:        ${counts.quoteRequests}`)
  console.log(`  quote_revisions:       ${counts.quoteRevisions}`)
  console.log(`  rfq_notifications:     ${counts.rfqNotifications}`)
  console.log(`  contact_messages:      ${counts.contactMessages}`)
  console.log(`  category_requests:     ${counts.categoryRequests}`)
  console.log(`  audit_logs:            ${counts.auditLogs}`)
  console.log(`  deals:                 ${counts.deals}`)
  console.log(`  deal_payments:         ${counts.dealPayments}`)
  console.log(`  deal_events:           ${counts.dealEvents}`)
  console.log(`  catalog.products:      ${counts.catalogProducts}`)
  console.log(`  catalog.categories:    ${counts.catalogCategories} (preserved)`)
  console.log(`  catalog.brands:          ${counts.catalogBrands} (preserved)`)
  console.log(`  users:                 ${counts.users} (preserved)`)
  console.log(`  addresses:             ${counts.addresses} (preserved)`)
  console.log(`  subscriptions:         ${counts.subscriptions} (preserved)`)
  console.log(`  payments:              ${counts.payments} (preserved)`)
}

async function main() {
  assertCleanupAllowed('UAT cleanup')
  console.log('[uat-cleanup] Removing demo business data…')

  const { before, purged, after } = await runUatCleanup(prisma)

  console.log('')
  console.log('=== Before ===')
  printCounts('before', before)

  console.log('')
  console.log('=== Removed ===')
  Object.entries(purged).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })

  console.log('')
  console.log('=== After (UAT-ready) ===')
  printCounts('after', after)

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: LOGIN_EMAILS } },
    select: {
      email: true,
      role: true,
      companyName: true,
      portalUserId: true,
      buyerSubscriptionStatus: true,
      sellerSubscriptionStatus: true,
      addresses: { where: { isDefault: true }, select: { city: true } },
    },
    orderBy: { email: 'asc' },
  })

  console.log('')
  console.log(`=== Demo accounts preserved (${demoUsers.length}) ===`)
  for (const user of demoUsers) {
    const city = user.addresses[0]?.city ?? '—'
    const idLabel = user.portalUserId ? `User ID ${user.portalUserId}` : 'no portal user ID'
    console.log(`  ${user.email} (${user.role}) · ${user.companyName} · ${idLabel} · ${city}`)
  }

  const businessEmpty =
    after.products === 0
    && after.inventoryLogs === 0
    && after.orders === 0
    && after.deals === 0
    && after.rfqGroups === 0
    && after.quoteRequests === 0
    && after.quoteRevisions === 0
    && after.rfqNotifications === 0
    && after.contactMessages === 0
    && after.categoryRequests === 0
    && after.auditLogs === 0
    && after.catalogProducts === 0

  console.log('')
  if (businessEmpty) {
    console.log('[uat-cleanup] Done — marketplace is clean for fresh manual QA')
  } else {
    console.error('[uat-cleanup] WARNING: some business rows remain')
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error('[uat-cleanup] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
