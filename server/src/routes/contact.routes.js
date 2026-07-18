const { Router } = require('express')
const ctrl = require('../controllers/contactController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { contactUploadMiddleware } = require('../middleware/contactUpload.js')

const router = Router()

router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'))

router.get('/unread-reply-count',      ctrl.unreadReplyCount)
router.get('/',                        ctrl.listMyMessages)
router.get('/:id',                     ctrl.getMyMessage)
router.post('/', contactUploadMiddleware, ctrl.sendMessage)
router.post('/:id/replies', contactUploadMiddleware, ctrl.sendFollowUp)
router.patch('/:id/reply-read',        ctrl.markReplyRead)
router.patch('/mark-all-replies-read', ctrl.markAllRepliesRead)

module.exports = router
