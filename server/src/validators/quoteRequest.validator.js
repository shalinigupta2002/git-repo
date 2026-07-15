const { z } = require('zod')

const quoteRequestIdParam = z.object({
  id: z.string().uuid(),
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

const createQuoteRequestBody = z.object({
  productTitle: z.string().trim().min(1).max(300),
  productId: z.string().uuid().optional(),
  catalogProductId: z.string().max(64).optional(),
  sellerId: z.string().uuid().optional(),
  productCategory: z.string().trim().max(200).optional().nullable(),
  brandName: z.string().trim().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100000).optional().default(1),
  targetPrice: z.coerce.number().positive().max(1e12).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
})

module.exports = {
  quoteRequestIdParam,
  respondQuoteBody,
  listRequestsQuery,
  createQuoteRequestBody,
}
