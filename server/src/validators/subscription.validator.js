const { z } = require('zod')

const VALID_PLANS = ['BUYER_STANDARD', 'BUYER_LIFETIME', 'SELLER_MONTH', 'SELLER_LIFETIME']

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
