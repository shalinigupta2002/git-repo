const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const {
  PASSWORDS,
  ADMIN,
  BUYERS,
  SELLERS,
  LOGIN_EMAILS,
  CATALOG,
  PLAN_AMOUNTS_PAISE,
} = require('./constants.js')
const { runCleanup } = require('./cleanup.js')
const { upsertUsers, upsertAddresses } = require('./users.js')
const { seedMasterCatalog } = require('./catalog.js')

const prisma = new PrismaClient()

async function countRows() {
  const [
    users,
    addresses,
    subscriptions,
    payments,
    products,
    inventoryLogs,
    orders,
    rfqGroups,
    quoteRequests,
    contactMessages,
    categoryRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.address.count(),
    prisma.subscription.count(),
    prisma.payment.count(),
    prisma.product.count(),
    prisma.inventoryLog.count(),
    prisma.order.count(),
    prisma.rfqGroup.count(),
    prisma.quoteRequest.count(),
    prisma.contactMessage.count(),
    prisma.categoryRequest.count(),
  ])

  let catalog = { top_categories: 0, subcategories: 0, brands: 0, products: 0 }
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM catalog.categories WHERE parent_id IS NULL) AS top_categories,
        (SELECT COUNT(*)::int FROM catalog.categories WHERE parent_id IS NOT NULL) AS subcategories,
        (SELECT COUNT(*)::int FROM catalog.brands) AS brands,
        (SELECT COUNT(*)::int FROM catalog.products) AS products
    `)
    catalog = rows[0] || catalog
  } catch {
    // catalog schema optional until first seed
  }

  return {
    users,
    addresses,
    subscriptions,
    payments,
    products,
    inventoryLogs,
    orders,
    rfqGroups,
    quoteRequests,
    contactMessages,
    categoryRequests,
    catalog,
  }
}

async function verifyBootstrap(users) {
  const checks = []

  const admin = users[ADMIN.email]
  if (admin && await bcrypt.compare(PASSWORDS.admin, admin.passwordHash)) {
    checks.push({ name: 'Admin login', ok: true })
  } else {
    checks.push({ name: 'Admin login', ok: false })
  }

  for (const spec of [...BUYERS, ...SELLERS]) {
    const u = users[spec.email]
    const ok = u && await bcrypt.compare(spec.password, u.passwordHash)
    checks.push({ name: `${spec.email} login`, ok: Boolean(ok) })
    const subs = await prisma.subscription.count({
      where: { userId: u?.id, status: 'ACTIVE' },
    })
    checks.push({
      name: `${spec.email} no subscription`,
      ok: subs === 0,
    })
  }

  const empty = await countRows()
  checks.push({ name: 'No seller products', ok: empty.products === 0 })
  checks.push({ name: 'No orders/deals', ok: empty.orders === 0 })
  checks.push({ name: 'No RFQs', ok: empty.rfqGroups === 0 && empty.quoteRequests === 0 })
  checks.push({ name: 'No payments', ok: empty.payments === 0 })
  checks.push({ name: 'No catalog browse products', ok: Number(empty.catalog.products) === 0 })

  return checks
}

function printReport(legacyRemoved, catalogStats, counts, checks) {
  console.log('')
  console.log('=== Production bootstrap report ===')
  console.log('')
  console.log('Removed demo entities (this run):')
  console.log('  • All products, inventory logs')
  console.log('  • All RFQ groups, quote requests, RFQ counters')
  console.log('  • All orders, order items, order history')
  console.log('  • All subscriptions, payments')
  console.log('  • All contact messages, category requests, audit logs')
  console.log('  • All catalog.products (browse demo SKUs)')
  if (legacyRemoved.removed) {
    console.log(`  • Legacy demo users removed: ${legacyRemoved.emails.join(', ')}`)
  } else {
    console.log('  • No legacy demo users found')
  }
  console.log('')
  console.log('Remaining seed data counts:')
  console.log(`  users:                 ${counts.users}`)
  console.log(`  addresses:             ${counts.addresses}`)
  console.log(`  subscriptions:         ${counts.subscriptions}`)
  console.log(`  payments:              ${counts.payments}`)
  console.log(`  seller products:       ${counts.products}`)
  console.log(`  orders:                ${counts.orders}`)
  console.log(`  rfq_groups:            ${counts.rfqGroups}`)
  console.log(`  quote_requests:        ${counts.quoteRequests}`)
  console.log(`  contact_messages:      ${counts.contactMessages}`)
  console.log(`  category_requests:     ${counts.categoryRequests}`)
  console.log(`  catalog top categories:${counts.catalog.top_categories ?? catalogStats.topCategories}`)
  console.log(`  catalog subcategories: ${counts.catalog.subcategories ?? catalogStats.subcategories}`)
  console.log(`  catalog brands:        ${counts.catalog.brands ?? catalogStats.brands}`)
  console.log(`  catalog products:      ${counts.catalog.products ?? catalogStats.products}`)
  console.log('')
  console.log('=== Login credentials ===')
  console.log(`  Admin:   ${ADMIN.email} / ${PASSWORDS.admin}`)
  console.log('  Buyers:  buyer1@test.com … buyer5@test.com / Buyer@123')
  console.log('  Sellers: seller1@test.com … seller5@test.com / Seller@123')
  console.log('')
  console.log('Subscription plans (code config — server/src/config/subscriptionPlans.js):')
  Object.entries(PLAN_AMOUNTS_PAISE).forEach(([plan, paise]) => {
    console.log(`  ${plan}: ₹${(paise / 100).toLocaleString('en-IN')}`)
  })
  console.log('')
  console.log('Verification:')
  for (const c of checks) {
    console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.name}`)
  }
  console.log('')
  console.log('Notes:')
  console.log(`  • KYC / verified flags not in schema — profile = companyName + address`)
  console.log(`  • No BUY-/SEL- member IDs until subscription is purchased`)
  console.log(`  • Marketplace is empty — ready for manual subscription & listing tests`)
  console.log(`  • Master taxonomy: ${CATALOG.length} top-level categories`)
}

async function main() {
  console.log('[bootstrap] Production marketplace bootstrap (login accounts + master data only)')

  const legacyRemoved = await runCleanup(prisma)
  console.log('[bootstrap] Transactional demo data purged')

  const users = await upsertUsers(prisma)
  console.log('[bootstrap] Login accounts upserted (11 users)')

  await upsertAddresses(prisma, users)
  console.log('[bootstrap] Addresses upserted (10 non-admin users)')

  const catalogStats = await seedMasterCatalog(prisma)
  console.log('[bootstrap] Master catalog taxonomy upserted (categories + brands)')

  const counts = await countRows()
  const checks = await verifyBootstrap(users)
  printReport(legacyRemoved, catalogStats, counts, checks)

  const failed = checks.filter((c) => !c.ok)
  if (failed.length) {
    console.error(`[bootstrap] Verification failed: ${failed.length} check(s)`)
    process.exitCode = 1
  } else {
    console.log('[bootstrap] Done — idempotent, marketplace clean')
  }
}

main()
  .catch((err) => {
    console.error('[bootstrap] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
