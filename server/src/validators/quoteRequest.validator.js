const { z } = require('zod')

const quoteRequestIdParam = z.object({
  id: z.string().uuid(),
})

const rfqGroupIdParam = z.object({
  rfqGroupId: z.string().uuid(),
})

const attachmentItem = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2000),
  mimeType: z.string().trim().max(100).optional().nullable(),
  sizeBytes: z.coerce.number().int().min(0).optional().nullable(),
})

const respondQuoteBody = z.object({
  sellerUnitPrice: z.coerce.number().positive().max(1e12),
  sellerCurrency:  z.string().trim().length(3).optional().default('INR'),
  taxNote:         z.string().trim().max(500).optional().nullable(),
  quoteValidUntil: z.string().trim().optional().nullable(),
  freightNote:     z.string().trim().max(1000).optional().nullable(),
  exclusionsNote:  z.string().trim().max(1000).optional().nullable(),
})

const listRequestsQuery = z.object({
  viewAs: z.enum(['buyer', 'seller']).optional(),
})

const groupedListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['all', 'PENDING', 'RESPONDED', 'ACCEPTED', 'DECLINED']).optional(),
  q: z.string().trim().max(200).optional(),
  expired: z.coerce.boolean().optional(),
})

const statsQuery = z.object({
  viewAs: z.enum(['buyer', 'seller']).optional(),
})

const createQuoteRequestBody = z.object({
  productTitle: z.string().trim().min(1).max(300),
  productId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  catalogProductId: z.string().max(64).optional(),
  sellerId: z.string().uuid().optional(),
  sellerIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  productCategory: z.string().trim().max(200).optional().nullable(),
  brandName: z.string().trim().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100000).optional().default(1),
  /** Optional indicative budget only — non-binding, informational for sellers. */
  targetPrice: z.coerce.number().positive().max(1e12).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
  deliveryLocation: z.string().trim().min(1).max(500),
  expectedDeliveryDate: z.string().trim().min(1),
  attachments: z.array(attachmentItem).max(10).optional().nullable(),
}).superRefine((data, ctx) => {
  if (Array.isArray(data.productIds) && data.productIds.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Multi-product RFQ is not supported yet. This feature belongs to a future release.',
      path: ['productIds'],
    })
  }
})

module.exports = {
  quoteRequestIdParam,
  rfqGroupIdParam,
  respondQuoteBody,
  listRequestsQuery,
  groupedListQuery,
  statsQuery,
  createQuoteRequestBody,
}
