const { Router } = require('express')
const orderController = require('../controllers/orderController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { requireSubscription } = require('../middleware/requireSubscription.js')
const { validate } = require('../middleware/validate.js')
const {
  createOrderBody,
  listOrdersQuery,
  orderIdParam,
  updateOrderStatusBody,
} = require('../validators/order.validator.js')

const router = Router()

// Placing an order requires an active BUYER subscription.
// Admins bypass the subscription check (see requireSubscription).
router.post(
  '/',
  authenticate,
  authorize('BUYER', 'ADMIN'),
  requireSubscription('BUYER'),
  validate(createOrderBody),
  orderController.create,
)

// Listing and reading orders — scoped by role in the controller
router.get(
  '/',
  authenticate,
  validate(listOrdersQuery, 'query'),
  orderController.list,
)

router.get(
  '/:id',
  authenticate,
  validate(orderIdParam, 'params'),
  orderController.getById,
)

// Full immutable status-change log for a single order
router.get(
  '/:id/history',
  authenticate,
  validate(orderIdParam, 'params'),
  orderController.getHistory,
)

// Only sellers (and admins) can advance order status
router.patch(
  '/:id/status',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(orderIdParam, 'params'),
  validate(updateOrderStatusBody),
  orderController.updateStatus,
)

module.exports = router
