const { Router } = require('express')
const ctrl = require('../controllers/quoteRequestController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { requireSubscription, authorizeWorkspace } = require('../middleware/requireSubscription.js')
const { validate } = require('../middleware/validate.js')
const {
  quoteRequestIdParam,
  respondQuoteBody,
  listRequestsQuery,
  createQuoteRequestBody,
} = require('../validators/quoteRequest.validator.js')

const router = Router()

router.use(authenticate)

router.post('/', authorizeWorkspace('BUYER'), requireSubscription('BUYER'), validate(createQuoteRequestBody), ctrl.createRequest)
router.get('/', validate(listRequestsQuery, 'query'), ctrl.listRequests)
router.get('/confirmed-buyers', authorizeWorkspace('SELLER'), ctrl.listConfirmedBuyers)
router.get('/:id', validate(quoteRequestIdParam, 'params'), ctrl.getById)
router.patch(
  '/:id/seller-reject',
  authorizeWorkspace('SELLER'),
  requireSubscription('SELLER'),
  validate(quoteRequestIdParam, 'params'),
  ctrl.sellerReject,
)
router.patch(
  '/:id/respond',
  authorizeWorkspace('SELLER'),
  requireSubscription('SELLER'),
  validate(quoteRequestIdParam, 'params'),
  validate(respondQuoteBody),
  ctrl.respond,
)
router.patch(
  '/:id/accept',
  authorizeWorkspace('BUYER'),
  requireSubscription('BUYER'),
  validate(quoteRequestIdParam, 'params'),
  ctrl.buyerAccept,
)
router.patch(
  '/:id/reject',
  authorizeWorkspace('BUYER'),
  requireSubscription('BUYER'),
  validate(quoteRequestIdParam, 'params'),
  ctrl.buyerReject,
)

module.exports = router
