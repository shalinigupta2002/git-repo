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

module.exports = {
  quoteRequestIdParam,
  respondQuoteBody,
}
