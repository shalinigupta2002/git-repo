const { Router } = require('express')
const ctrl = require('../controllers/quoteRequestController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const { quoteRequestIdParam, respondQuoteBody } = require('../validators/quoteRequest.validator.js')

const router = Router()

router.use(authenticate)

router.post('/', authorize('BUYER'), ctrl.createRequest)
router.get('/', authorize('SELLER', 'ADMIN'), ctrl.listRequests)
router.get('/confirmed-buyers', authorize('SELLER', 'ADMIN'), ctrl.listConfirmedBuyers)
router.get('/:id', authorize('SELLER', 'ADMIN'), validate(quoteRequestIdParam, 'params'), ctrl.getById)
router.patch(
  '/:id/respond',
  authorize('SELLER', 'ADMIN'),
  validate(quoteRequestIdParam, 'params'),
  validate(respondQuoteBody),
  ctrl.respond,
)
router.patch(
  '/:id/accept',
  authorize('SELLER', 'ADMIN'),
  validate(quoteRequestIdParam, 'params'),
  ctrl.accept,
)

module.exports = router
