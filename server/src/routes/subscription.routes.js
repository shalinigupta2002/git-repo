const { Router } = require('express')
const subscriptionController = require('../controllers/subscriptionController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  createOrderBody,
  verifyPaymentBody,
} = require('../validators/subscription.validator.js')

const router = Router()

router.use(authenticate)

/** Create a Razorpay order for the chosen plan */
router.post('/create-order', validate(createOrderBody), subscriptionController.createOrder)

/** Verify Razorpay signature and activate subscription */
router.post('/verify', validate(verifyPaymentBody), subscriptionController.verifyPayment)

/** Return current active subscription status for the authenticated user */
router.get('/status', subscriptionController.getStatus)

module.exports = router
