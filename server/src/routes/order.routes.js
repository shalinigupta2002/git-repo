const { Router } = require('express')
const orderController = require('../controllers/orderController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { authorizeWorkspace } = require('../middleware/requireSubscription.js')
const { validate } = require('../middleware/validate.js')
const {
  listOrdersQuery,
  orderIdParam,
  updateOrderStatusBody,
} = require('../validators/order.validator.js')

const router = Router()

// Deal records are created only via quotation acceptance (createOrderFromQuote).
// Direct buyer order creation is not supported on this marketplace.

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
  authorizeWorkspace('SELLER'),
  validate(orderIdParam, 'params'),
  validate(updateOrderStatusBody),
  orderController.updateStatus,
)

module.exports = router
