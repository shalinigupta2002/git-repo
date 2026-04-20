const { Router } = require('express')
const orderController = require('../controllers/orderController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  createOrderBody,
  listOrdersQuery,
  orderIdParam,
  updateOrderStatusBody,
} = require('../validators/order.validator.js')

const router = Router()

router.post(
  '/',
  authenticate,
  authorize('BUYER', 'ADMIN'),
  validate(createOrderBody),
  orderController.create,
)

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

router.patch(
  '/:id/status',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(orderIdParam, 'params'),
  validate(updateOrderStatusBody),
  orderController.updateStatus,
)

module.exports = router
