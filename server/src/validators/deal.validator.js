'use strict'

const { z } = require('zod')

const dealStatuses = z.enum([
  'QUOTATION_ACCEPTED',
  'DEAL_CREATED',
  'PAYMENT_PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
])

const listDealsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: dealStatuses.optional(),
  search: z.string().trim().max(120).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dealNumber', 'status', 'totalAmount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

const adminListDealsQuery = listDealsQuery.extend({
  buyerId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
})

const dealIdParam = z.object({
  dealId: z.string().uuid(),
})

const verifyDealPaymentBody = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
})

const chargeConfigIdParam = z.object({
  id: z.string().min(1, 'Config ID or key is required'),
})

const updateDealChargeConfigBody = z.object({
  chargeType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  displayName: z.string().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (body) => Object.keys(body).length > 0,
  { message: 'At least one field must be provided.' },
)

module.exports = {
  listDealsQuery,
  adminListDealsQuery,
  dealIdParam,
  verifyDealPaymentBody,
  chargeConfigIdParam,
  updateDealChargeConfigBody,
}
