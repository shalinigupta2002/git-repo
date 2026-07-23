const { z } = require('zod')

/** Shared pagination query used by all admin listing endpoints. */
const paginationQuery = z.object({
  page:  z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
})

/**
 * GET /admin/buyers
 * GET /admin/sellers
 */
const listUsersQuery = paginationQuery.extend({
  search: z.string().trim().max(200).optional(),
})

/**
 * GET /admin/transactions
 */
const listTransactionsQuery = paginationQuery.extend({
  status: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        const s = val.trim().toUpperCase()
        if (!s || s === 'UNDEFINED' || s === 'NULL' || s === 'ALL') return undefined
        return s
      }
      return val
    }, z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional()),
  buyerId:  z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
})

/**
 * GET /admin/audit-logs
 */
const listAuditLogsQuery = paginationQuery.extend({
  actorId:    z.string().uuid().optional(),
  action:     z
    .enum(['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'STOCK_ADJUST'])
    .optional(),
  resource:   z.string().trim().max(64).optional(),
  resourceId: z.string().uuid().optional(),
  from:       z.string().datetime({ offset: true }).optional(),
  to:         z.string().datetime({ offset: true }).optional(),
})

const listSubscribersQuery = paginationQuery.extend({
  search: z.string().trim().max(200).optional(),
  role: z.enum(['BUYER', 'SELLER', 'BOTH', 'ALL']).optional().default('ALL'),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'ALL']).optional().default('ALL'),
  planType: z.enum(['MONTHLY', 'ANNUAL', 'LIFETIME', 'ALL']).optional().default('ALL'),
})

const subscriberIdParam = z.object({
  id: z.string().uuid(),
})

const updateSubscriberBody = z.object({
  role: z.enum(['BUYER', 'SELLER']).optional(),
  buyerSubscriptionPlan: z.enum([
    'BUYER_MONTHLY', 'BUYER_ANNUAL', 'BUYER_LIFETIME',
    'BOTH_MONTHLY', 'BOTH_ANNUAL', 'BOTH_LIFETIME',
    'BUYER_STANDARD', 'SELLER_MONTH', 'BOTH_STANDARD_MONTH',
  ]).optional().nullable(),
  buyerSubscriptionStatus: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional().nullable(),
  sellerSubscriptionPlan: z.enum([
    'SELLER_MONTHLY', 'SELLER_ANNUAL', 'SELLER_LIFETIME',
    'BOTH_MONTHLY', 'BOTH_ANNUAL', 'BOTH_LIFETIME',
    'BUYER_STANDARD', 'SELLER_MONTH', 'BOTH_STANDARD_MONTH',
  ]).optional().nullable(),
  sellerSubscriptionStatus: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional().nullable(),
  startsAt: z.string().datetime({ offset: true }).optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
}).refine(
  (body) => Object.keys(body).length > 0,
  { message: 'At least one editable field is required' },
)

module.exports = { listUsersQuery, listTransactionsQuery, paginationQuery, listAuditLogsQuery, listSubscribersQuery, subscriberIdParam, updateSubscriberBody }
