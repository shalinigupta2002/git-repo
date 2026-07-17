const { Router } = require('express')
const ctrl = require('../controllers/quoteRequestController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { requireSubscription, authorizeWorkspace } = require('../middleware/requireSubscription.js')
const { validate } = require('../middleware/validate.js')
const { rfqUploadMiddleware } = require('../middleware/rfqUpload.js')
const {
  quoteRequestIdParam,
  rfqGroupIdParam,
  respondQuoteBody,
  listRequestsQuery,
  groupedListQuery,
  statsQuery,
  notificationsQuery,
  markNotificationsReadBody,
  createQuoteRequestBody,
} = require('../validators/quoteRequest.validator.js')

const router = Router()

router.use(authenticate)

router.post('/', authorizeWorkspace('BUYER'), requireSubscription('BUYER'), validate(createQuoteRequestBody), ctrl.createRequest)
router.post('/attachments', authorizeWorkspace('BUYER'), requireSubscription('BUYER'), rfqUploadMiddleware, ctrl.uploadAttachments)
router.get('/attachments/file/:filename', ctrl.downloadAttachment)
router.get('/notifications', validate(notificationsQuery, 'query'), ctrl.listNotifications)
router.patch('/notifications/read', validate(markNotificationsReadBody), ctrl.markNotificationsRead)
router.get('/', validate(listRequestsQuery, 'query'), ctrl.listRequests)
router.get('/stats', validate(statsQuery, 'query'), ctrl.getStats)
router.get('/groups', authorizeWorkspace('BUYER'), validate(groupedListQuery, 'query'), ctrl.listGroupedRequests)
router.get('/groups/:rfqGroupId', authorizeWorkspace('BUYER'), validate(rfqGroupIdParam, 'params'), ctrl.getGroupComparison)
router.get('/confirmed-buyers', authorizeWorkspace('SELLER'), ctrl.listConfirmedBuyers)
router.get('/:id', validate(quoteRequestIdParam, 'params'), ctrl.getById)
router.patch(
  '/:id/cancel',
  authorizeWorkspace('BUYER'),
  requireSubscription('BUYER'),
  validate(quoteRequestIdParam, 'params'),
  ctrl.buyerCancel,
)
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
