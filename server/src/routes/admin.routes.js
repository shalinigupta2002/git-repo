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
} = require('../validators/admin.validator.js')

const router = Router()

// All admin routes require a valid ADMIN JWT
router.use(authenticate, authorize('ADMIN'))

router.get('/buyers',       validate(listUsersQuery,        'query'), adminController.listBuyers)
router.get('/sellers',      validate(listUsersQuery,        'query'), adminController.listSellers)
router.get('/transactions', validate(listTransactionsQuery, 'query'), adminController.listTransactions)
router.get('/stats',        validate(paginationQuery,       'query'), adminController.stats)
router.get('/audit-logs',   validate(listAuditLogsQuery,   'query'), adminController.listAuditLogs)

// ─── Catalog category management ─────────────────────────────────────────────
router.get('/categories',          adminController.listCategories)
router.post('/categories',         adminController.createCategory)
router.patch('/categories/:id',    adminController.updateCategory)
router.delete('/categories/:id',   adminController.deleteCategory)

// ─── Category requests (seller requests) ──────────────────────────────────────
router.get('/category-requests',               adminController.listCategoryRequests)
router.patch('/category-requests/:id/decide',  adminController.decideCategoryRequest)

// ─── Contact messages (buyer/seller → admin) ──────────────────────────────────
router.get('/messages/unread-count',           contactController.adminUnreadCount)
router.get('/messages',                        contactController.adminListMessages)
router.patch('/messages/:id/read',             contactController.adminMarkRead)
router.patch('/messages/:id/reply',            contactController.adminReply)

module.exports = router

