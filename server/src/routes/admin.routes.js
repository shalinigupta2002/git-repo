const { Router } = require('express')
const adminController  = require('../controllers/adminController.js')
const contactController = require('../controllers/contactController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  listUsersQuery,
  listTransactionsQuery,
  paginationQuery,
  listAuditLogsQuery,
  listSubscribersQuery,
  listCategoryRequestsQuery,
  listAdminMessagesQuery,
  createAdminCategoryBody,
  catalogCategoryIdParam,
  updateAdminCategoryBody,
  subscriberIdParam,
  updateSubscriberBody,
} = require('../validators/admin.validator.js')
const { uuidIdParam } = require('../validators/common.validator.js')
const { adminContactReplyBody } = require('../validators/contact.validator.js')
const { decideCategoryRequestBody } = require('../validators/categoryRequest.validator.js')

const router = Router()

// All admin routes require a valid ADMIN JWT
router.use(authenticate, authorize('ADMIN'))

router.get('/buyers',       validate(listUsersQuery,        'query'), adminController.listBuyers)
router.get('/sellers',      validate(listUsersQuery,        'query'), adminController.listSellers)
router.get('/subscribers',  validate(listSubscribersQuery, 'query'), adminController.listSubscribers)
router.get('/subscribers/stats', adminController.subscriberStats)
router.patch('/subscribers/:id', validate(subscriberIdParam, 'params'), validate(updateSubscriberBody), adminController.updateSubscriber)
router.patch('/subscribers/:id/deactivate', validate(subscriberIdParam, 'params'), adminController.deactivateSubscriber)
router.patch('/subscribers/:id/reactivate', validate(subscriberIdParam, 'params'), adminController.reactivateSubscriber)
router.get('/transactions', validate(listTransactionsQuery, 'query'), adminController.listTransactions)
router.get('/stats',        validate(paginationQuery,       'query'), adminController.stats)
router.get('/audit-logs',   validate(listAuditLogsQuery,   'query'), adminController.listAuditLogs)

// ─── Catalog category management ─────────────────────────────────────────────
router.get('/categories',          adminController.listCategories)
router.post('/categories', validate(createAdminCategoryBody), adminController.createCategory)
router.patch(
  '/categories/:id',
  validate(catalogCategoryIdParam, 'params'),
  validate(updateAdminCategoryBody),
  adminController.updateCategory,
)
router.delete(
  '/categories/:id',
  validate(catalogCategoryIdParam, 'params'),
  adminController.deleteCategory,
)

// ─── Category requests (seller requests) ──────────────────────────────────────
router.get(
  '/category-requests',
  validate(listCategoryRequestsQuery, 'query'),
  adminController.listCategoryRequests,
)
router.patch(
  '/category-requests/:id/decide',
  validate(uuidIdParam, 'params'),
  validate(decideCategoryRequestBody),
  adminController.decideCategoryRequest,
)

// ─── Contact messages (buyer/seller → admin) ──────────────────────────────────
router.get('/messages/unread-count',           contactController.adminUnreadCount)
router.get(
  '/messages',
  validate(listAdminMessagesQuery, 'query'),
  contactController.adminListMessages,
)
router.get('/messages/:id', validate(uuidIdParam, 'params'), contactController.adminGetMessage)
router.patch('/messages/:id/read', validate(uuidIdParam, 'params'), contactController.adminMarkRead)
router.patch(
  '/messages/:id/reply',
  validate(uuidIdParam, 'params'),
  validate(adminContactReplyBody),
  contactController.adminReply,
)

module.exports = router

