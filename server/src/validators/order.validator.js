const { z } = require('zod')

const orderItem = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1e9),
})

const createOrderBody = z.object({
  items: z.array(orderItem).min(1).max(100),
  notes: z.string().max(2000).optional().nullable(),
  buyerId: z.string().uuid().optional(),
})

const listOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
})

const orderIdParam = z.object({
  id: z.string().uuid(),
})

const updateOrderStatusBody = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
})

module.exports = {
  createOrderBody,
  listOrdersQuery,
  orderIdParam,
  updateOrderStatusBody,
}
