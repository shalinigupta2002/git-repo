const { z } = require('zod')

/** Shared route param: `:id` as UUID (contact messages, category requests, etc.). */
const uuidIdParam = z.object({
  id: z.string().uuid(),
})

/** Integration route param: `:userId` */
const userIdParam = z.object({
  userId: z.string().uuid(),
})

/** Integration route param: `:supplierId` */
const supplierIdParam = z.object({
  supplierId: z.string().uuid(),
})

module.exports = { uuidIdParam, userIdParam, supplierIdParam }
