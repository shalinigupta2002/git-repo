const { LEGACY_DEMO_EMAILS, LOGIN_EMAILS } = require('./constants.js')

/**
 * Remove all marketplace transactional data so bootstrap leaves a clean slate.
 * Master catalog categories/brands are preserved (products truncated separately).
 */
async function purgeTransactionalData(prisma) {
  await prisma.orderHistory.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.quoteRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.rfqGroup.deleteMany()
  await prisma.rfqNumberCounter.deleteMany()
  await prisma.inventoryLog.deleteMany()
  await prisma.product.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.contactMessage.deleteMany()
  await prisma.categoryRequest.deleteMany()
  await prisma.auditLog.deleteMany()

  try {
    await prisma.$executeRawUnsafe('DELETE FROM catalog.products')
  } catch {
    // catalog schema may not exist on first run
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

/** Strip subscriptions/payments from login test accounts (idempotent safety net) */
async function clearLoginAccountSubscriptions(prisma) {
  const loginUsers = await prisma.user.findMany({
    where: { email: { in: LOGIN_EMAILS } },
    select: { id: true },
  })
  const ids = loginUsers.map((u) => u.id)
  if (!ids.length) return

  await prisma.payment.deleteMany({ where: { userId: { in: ids } } })
  await prisma.subscription.deleteMany({ where: { userId: { in: ids } } })
}

async function runCleanup(prisma) {
  await purgeTransactionalData(prisma)
  await clearLoginAccountSubscriptions(prisma)
  const legacy = await purgeLegacyUsers(prisma)
  return legacy
}

module.exports = {
  runCleanup,
  purgeTransactionalData,
  purgeLegacyUsers,
  clearLoginAccountSubscriptions,
}
