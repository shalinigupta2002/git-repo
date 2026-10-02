'use strict'

/**
 * Applies in-memory subscription rows to the Jest prisma mock using the same
 * rules as requireSubscription.hasActiveSubscription (for lifecycle tests).
 */
function installSubscriptionRows(prisma, rows, { now = new Date() } = {}) {
  prisma.subscription.findFirst.mockImplementation(async ({ where }) => {
    const match = rows.find((s) => {
      if (where.userId && s.userId !== where.userId) return false
      if (where.status && s.status !== where.status) return false
      if (where.plan?.in && !where.plan.in.includes(s.plan)) return false
      if (where.startsAt?.lte && s.startsAt > where.startsAt.lte) return false
      if (where.OR) {
        const dateOk = where.OR.some((clause) => {
          if ('expiresAt' in clause && clause.expiresAt === null) return s.expiresAt === null
          if (clause.expiresAt?.gt) return s.expiresAt && s.expiresAt > clause.expiresAt.gt
          return false
        })
        if (!dateOk) return false
      }
      return true
    })
    return match ? { id: match.id ?? 'sub-match' } : null
  })
}

function authUserBase(user) {
  return {
    ...user,
    isActive: user.isActive !== false,
    portalUserId: user.portalUserId ?? null,
    buyerSubscriptionStatus: user.buyerSubscriptionStatus ?? null,
    buyerSubscriptionPlan: user.buyerSubscriptionPlan ?? null,
    buyerSubscriptionActivatedAt: user.buyerSubscriptionActivatedAt ?? null,
    sellerSubscriptionStatus: user.sellerSubscriptionStatus ?? null,
    sellerSubscriptionPlan: user.sellerSubscriptionPlan ?? null,
    sellerSubscriptionActivatedAt: user.sellerSubscriptionActivatedAt ?? null,
  }
}

module.exports = { installSubscriptionRows, authUserBase }
