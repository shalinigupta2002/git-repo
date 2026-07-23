const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')

/**
 * Plans that fulfil each subscription type.
 * Kept in sync with PLAN_CONFIG in subscriptionController.js.
 */
const PLANS_BY_TYPE = {
  SELLER: [
    'SELLER_MONTHLY',
    'SELLER_ANNUAL',
    'SELLER_LIFETIME',
    'BOTH_MONTHLY',
    'BOTH_ANNUAL',
    'BOTH_LIFETIME',
  ],
  BUYER: [
    'BUYER_MONTHLY',
    'BUYER_ANNUAL',
    'BUYER_LIFETIME',
    'BOTH_MONTHLY',
    'BOTH_ANNUAL',
    'BOTH_LIFETIME',
  ],
}

async function hasActiveSubscription(userId, type) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
    },
  })
  if (!user) return false
  if (user.role === 'ADMIN') return true
  if (user.isActive === false) return false

  const plans = PLANS_BY_TYPE[type]
  if (!plans) return false

  const now = new Date()
  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: { in: plans },
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { id: true },
  })

  return Boolean(activeSub)
}

/**
 * Middleware factory that enforces an active subscription before allowing
 * a request through.
 *
 * Usage (always place after authenticate + authorize):
 *   router.post('/', authenticate, authorize('SELLER'), requireSubscription('SELLER'), ...)
 *
 * Rules:
 *  - ADMIN users bypass the check — they can always act on behalf of others.
 *  - A 403 with code SUBSCRIPTION_REQUIRED is returned when no active
 *    subscription is found, so the client can redirect to the pricing page.
 *  - Expired subscriptions (expiresAt <= now) are treated as inactive.
 *
 * @param {'SELLER'|'BUYER'} type
 */
function requireSubscription(type) {
  if (!PLANS_BY_TYPE[type]) {
    throw new Error(`requireSubscription: unknown type "${type}". Use 'SELLER' or 'BUYER'.`)
  }

  const label = type.charAt(0) + type.slice(1).toLowerCase() // 'Seller' | 'Buyer'

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      // authenticate() must run before this middleware
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }

    // Admins bypass subscription checks so they can manage the platform
    // without holding a buyer or seller plan themselves.
    if (req.user.role === 'ADMIN') return next()

    const activeSub = await hasActiveSubscription(req.user.id, type)

    if (!activeSub) {
      throw new AppError(
        `An active ${label} subscription is required to perform this action.`,
        403,
        'SUBSCRIPTION_REQUIRED',
      )
    }

    next()
  })
}

/**
 * Allow access when the account role matches the workspace, or the user holds
 * an active subscription for that workspace (e.g. BOTH bundle on one account).
 */
function authorizeWorkspace(type) {
  if (!PLANS_BY_TYPE[type]) {
    throw new Error(`authorizeWorkspace: unknown type "${type}". Use 'SELLER' or 'BUYER'.`)
  }

  const roleForType = type

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }

    if (req.user.role === 'ADMIN') return next()
    if (req.user.role === roleForType) return next()

    const activeSub = await hasActiveSubscription(req.user.id, type)
    if (!activeSub) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    next()
  })
}

module.exports = { requireSubscription, hasActiveSubscription, PLANS_BY_TYPE, authorizeWorkspace }
