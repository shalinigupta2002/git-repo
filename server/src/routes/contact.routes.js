const { Router } = require('express')
const ctrl = require('../controllers/contactController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { contactUploadMiddleware } = require('../middleware/contactUpload.js')
const { validate } = require('../middleware/validate.js')
const { uuidIdParam } = require('../validators/common.validator.js')
const {
  createContactMessageBody,
  contactFollowUpBody,
} = require('../validators/contact.validator.js')

const router = Router()

router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'))

router.get('/unread-reply-count',      ctrl.unreadReplyCount)
router.get('/',                        ctrl.listMyMessages)
router.get('/:id', validate(uuidIdParam, 'params'), ctrl.getMyMessage)
router.post('/', contactUploadMiddleware, validate(createContactMessageBody), ctrl.sendMessage)
router.post(
  '/:id/replies',
  validate(uuidIdParam, 'params'),
  contactUploadMiddleware,
  validate(contactFollowUpBody),
  ctrl.sendFollowUp,
)
router.patch('/:id/reply-read', validate(uuidIdParam, 'params'), ctrl.markReplyRead)
router.patch('/mark-all-replies-read', ctrl.markAllRepliesRead)

module.exports = router
