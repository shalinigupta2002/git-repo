const { Router } = require('express')
const ctrl = require('../controllers/contactController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')

const router = Router()

// All contact routes require authentication (buyers, sellers, or admin)
router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'))

router.get('/unread-reply-count',     ctrl.unreadReplyCount)
router.get('/',                       ctrl.listMyMessages)
router.post('/',                      ctrl.sendMessage)
router.patch('/:id/reply-read',       ctrl.markReplyRead)
router.patch('/mark-all-replies-read', ctrl.markAllRepliesRead)

module.exports = router
