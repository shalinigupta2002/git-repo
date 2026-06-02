const { Router } = require('express')
const ctrl = require('../controllers/categoryRequestController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')

const router = Router()

// Seller-only routes (SELLER or ADMIN acting as seller)
router.use(authenticate, authorize('SELLER', 'ADMIN'))

router.get('/',               ctrl.listMyRequests)
router.get('/unread-count',   ctrl.unreadCount)
router.post('/',              ctrl.createRequest)
router.patch('/:id/read',     ctrl.markRead)
router.patch('/mark-all-read', ctrl.markAllRead)

module.exports = router
