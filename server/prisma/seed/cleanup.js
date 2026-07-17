const fs = require('fs')
const path = require('path')
const {
  LEGACY_DEMO_EMAILS,
  MANUAL_ONBOARDING_EMAILS,
  PREMIUM_USER_EMAILS,
  shouldSeedQaUsers,
} = require('./constants.js')

const UPLOAD_DIRS = [
  path.join(__dirname, '../../uploads/rfq'),
  path.join(__dirname, '../../uploads/products'),
  path.join(__dirname, '../../uploads/contact'),
]

/**
 * Remove marketplace business / transactional data.
 * Preserves users, addresses, subscriptions, payments, and master catalog taxonomy by default.
 */
async function purgeBusinessData(prisma, { preserveSubscriptions = true } = {}) {
  const counts = {}

  counts.rfqNotificationEvents = (await prisma.rfqNotificationEvent.deleteMany()).count
  counts.quoteRevisions = (await prisma.quoteRevision.deleteMany()).count
  counts.orderHistory = (await prisma.orderHistory.deleteMany()).count
  counts.orderItems = (await prisma.orderItem.deleteMany()).count
  counts.quoteRequests = (await prisma.quoteRequest.deleteMany()).count
  counts.orders = (await prisma.order.deleteMany()).count
  counts.rfqGroups = (await prisma.rfqGroup.deleteMany()).count
  counts.rfqNumberCounters = (await prisma.rfqNumberCounter.deleteMany()).count
  counts.inventoryLogs = (await prisma.inventoryLog.deleteMany()).count
  counts.products = (await prisma.product.deleteMany()).count
  counts.contactMessages = (await prisma.contactMessage.deleteMany()).count
  counts.categoryRequests = (await prisma.categoryRequest.deleteMany()).count
  counts.auditLogs = (await prisma.auditLog.deleteMany()).count

  if (!preserveSubscriptions) {
    counts.payments = (await prisma.payment.deleteMany()).count
    counts.subscriptions = (await prisma.subscription.deleteMany()).count
  }

  counts.catalogProducts = 0
  try {
    const result = await prisma.$executeRawUnsafe('DELETE FROM catalog.products')
    counts.catalogProducts = Number(result) || 0
  } catch {
    // catalog schema optional until first seed
  }

  counts.uploadFiles = clearUploadDirectories()

  return counts
}

/** @deprecated use purgeBusinessData — kept for bootstrap re-seed flow */
async function purgeTransactionalData(prisma) {
  return purgeBusinessData(prisma, { preserveSubscriptions: false })
}

function clearUploadDirectories() {
  let removed = 0
  for (const dir of UPLOAD_DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      const filePath = path.join(dir, name)
      try {
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
          removed += 1
        }
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return removed
}

async function countBusinessRows(prisma) {
  const [
    products,
    inventoryLogs,
    orders,
    orderItems,
    orderHistory,
    rfqGroups,
    quoteRequests,
    quoteRevisions,
    rfqNotifications,
    contactMessages,
    categoryRequests,
    auditLogs,
    users,
    addresses,
    subscriptions,
    payments,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.inventoryLog.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderHistory.count(),
    prisma.rfqGroup.count(),
    prisma.quoteRequest.count(),
    prisma.quoteRevision.count(),
    prisma.rfqNotificationEvent.count(),
    prisma.contactMessage.count(),
    prisma.categoryRequest.count(),
    prisma.auditLog.count(),
    prisma.user.count(),
    prisma.address.count(),
    prisma.subscription.count(),
    prisma.payment.count(),
  ])

  let catalogProducts = 0
  let catalogCategories = 0
  let catalogBrands = 0
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM catalog.products) AS products,
        (SELECT COUNT(*)::int FROM catalog.categories) AS categories,
        (SELECT COUNT(*)::int FROM catalog.brands) AS brands
    `)
    catalogProducts = rows[0]?.products ?? 0
    catalogCategories = rows[0]?.categories ?? 0
    catalogBrands = rows[0]?.brands ?? 0
  } catch {
    // catalog schema optional
  }

  return {
    products,
    inventoryLogs,
    orders,
    orderItems,
    orderHistory,
    rfqGroups,
    quoteRequests,
    quoteRevisions,
    rfqNotifications,
    contactMessages,
    categoryRequests,
    auditLogs,
    users,
    addresses,
    subscriptions,
    payments,
    catalogProducts,
    catalogCategories,
    catalogBrands,
  }
}

/** Delete demo-only user accounts from prior seeds (cascades addresses, etc.) */
async function purgeLegacyUsers(prisma) {
  const legacy = await prisma.user.findMany({
    where: {
      email: { in: LEGACY_DEMO_EMAILS },
    },
    select: { id: true, email: true },
  })

  if (!legacy.length) return { removed: 0, emails: [] }

  const ids = legacy.map((u) => u.id)
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  return { removed: legacy.length, emails: legacy.map((u) => u.email) }
}

/** Remove premium QA accounts when seeding production bootstrap only */
async function purgePremiumUsers(prisma) {
  if (shouldSeedQaUsers()) return { removed: 0, emails: [] }

  const premium = await prisma.user.findMany({
    where: { email: { in: PREMIUM_USER_EMAILS } },
    select: { id: true, email: true },
  })

  if (!premium.length) return { removed: 0, emails: [] }

  const ids = premium.map((u) => u.id)
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  return { removed: premium.length, emails: premium.map((u) => u.email) }
}

/** Strip subscriptions/payments from manual onboarding accounts only */
async function clearManualOnboardingSubscriptions(prisma) {
  const loginUsers = await prisma.user.findMany({
    where: { email: { in: MANUAL_ONBOARDING_EMAILS } },
    select: { id: true },
  })
  const ids = loginUsers.map((u) => u.id)
  if (!ids.length) return

  await prisma.payment.deleteMany({ where: { userId: { in: ids } } })
  await prisma.subscription.deleteMany({ where: { userId: { in: ids } } })

  await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: {
      buyerMarketplaceId: null,
      buyerSubscriptionStatus: null,
      buyerSubscriptionPlan: null,
      buyerSubscriptionActivatedAt: null,
      sellerMarketplaceId: null,
      sellerSubscriptionStatus: null,
      sellerSubscriptionPlan: null,
      sellerSubscriptionActivatedAt: null,
    },
  })
}

async function runCleanup(prisma) {
  await purgeTransactionalData(prisma)
  await clearManualOnboardingSubscriptions(prisma)
  const legacy = await purgeLegacyUsers(prisma)
  const premiumRemoved = await purgePremiumUsers(prisma)
  return {
    ...legacy,
    premiumRemoved: premiumRemoved.removed,
    premiumEmails: premiumRemoved.emails,
  }
}

async function runUatCleanup(prisma) {
  const before = await countBusinessRows(prisma)
  const purged = await purgeBusinessData(prisma, { preserveSubscriptions: true })
  const after = await countBusinessRows(prisma)
  return { before, purged, after }
}

module.exports = {
  runCleanup,
  runUatCleanup,
  purgeBusinessData,
  purgeTransactionalData,
  purgeLegacyUsers,
  purgePremiumUsers,
  clearManualOnboardingSubscriptions,
  countBusinessRows,
  clearUploadDirectories,
}
