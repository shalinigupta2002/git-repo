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
    .enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
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

module.exports = { listUsersQuery, listTransactionsQuery, paginationQuery, listAuditLogsQuery }
