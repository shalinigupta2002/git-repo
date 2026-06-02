const { z } = require('zod')
const { addressSnapshot } = require('./address.validator.js')

const orderItem = z.object({
  productId: z.string().uuid(),
  quantity:  z.coerce.number().int().min(1).max(1e9),
})

const createOrderBody = z.object({
  items:           z.array(orderItem).min(1).max(100),
  notes:           z.string().max(2000).optional().nullable(),
  buyerId:         z.string().uuid().optional(),
  /// Optional shipping/billing address inline snapshot captured at order time.
  /// If the buyer has saved addresses, the frontend can pre-fill these fields.
  shippingAddress: addressSnapshot.optional().nullable(),
  billingAddress:  addressSnapshot.optional().nullable(),
})

const listOrdersQuery = z.object({
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
})

const orderIdParam = z.object({
  id: z.string().uuid(),
})

const updateOrderStatusBody = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note:   z.string().max(1000).optional().nullable(),
})

module.exports = {
  createOrderBody,
  listOrdersQuery,
  orderIdParam,
  updateOrderStatusBody,
}
