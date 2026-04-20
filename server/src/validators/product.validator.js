const { z } = require('zod')

/** Express query strings are strings — normalize booleans */
function queryBool(defaultValue = false) {
  return z.preprocess((val) => {
    if (val === undefined || val === '') return defaultValue
    if (typeof val === 'boolean') return val
    if (val === 'true' || val === '1') return true
    if (val === 'false' || val === '0') return false
    return defaultValue
  }, z.boolean())
}

const createProductBody = z.object({
  sellerId: z.string().uuid().optional(),
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().positive().max(1e12),
  moq: z.coerce.number().int().min(1).max(1e9).optional().default(1),
  currency: z.string().trim().length(3).optional().default('INR'),
  isActive: z.boolean().optional().default(true),
})

const updateProductBody = createProductBody.partial()

const listProductsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sellerId: z.string().uuid().optional(),
  includeInactive: queryBool(false),
  mine: queryBool(false),
  search: z.string().trim().max(200).optional(),
})

const productIdParam = z.object({
  id: z.string().uuid(),
})

module.exports = {
  createProductBody,
  updateProductBody,
  listProductsQuery,
  productIdParam,
}
