const { z } = require('zod')

const VALID_PLANS = [
  // Finalized 9 plans
  'BUYER_MONTHLY',
  'BUYER_ANNUAL',
  'BUYER_LIFETIME',
  'SELLER_MONTHLY',
  'SELLER_ANNUAL',
  'SELLER_LIFETIME',
  'BOTH_MONTHLY',
  'BOTH_ANNUAL',
  'BOTH_LIFETIME',

  // Legacy plans for backward compatibility
  'BUYER_STANDARD',
  'SELLER_MONTH',
  'BOTH_STANDARD_MONTH',
  'BOTH_LIFETIME_LIFETIME',
  'BOTH_LIFETIME_MONTH',
  'BOTH_STANDARD_LIFETIME',
]

const createOrderBody = z.object({
  plan: z.enum(VALID_PLANS, {
    errorMap: () => ({ message: `plan must be one of: ${VALID_PLANS.join(', ')}` }),
  }),
})

const verifyPaymentBody = z.object({
  razorpayOrderId:   z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
})

module.exports = { createOrderBody, verifyPaymentBody }
