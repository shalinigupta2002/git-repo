const { Router } = require('express')
const ctrl = require('../controllers/quoteRequestController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')

const router = Router()

router.use(authenticate)

router.post('/', authorize('BUYER'), ctrl.createRequest)
router.get('/', authorize('SELLER', 'ADMIN'), ctrl.listRequests)

module.exports = router
