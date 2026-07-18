const { Router } = require('express')
const dealController = require('../controllers/dealController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { authorizeWorkspace } = require('../middleware/requireSubscription.js')
const { requireBuyerDealCapability } = require('../middleware/requireDealCapability.js')
const { validate } = require('../middleware/validate.js')
const { listDealsQuery, dealIdParam } = require('../validators/deal.validator.js')

const router = Router()

router.use(authenticate, authorizeWorkspace('BUYER'), requireBuyerDealCapability)

router.get('/', validate(listDealsQuery, 'query'), dealController.list)
router.get('/:dealId', validate(dealIdParam, 'params'), dealController.getById)
router.post('/:dealId/pay', validate(dealIdParam, 'params'), dealController.pay)

module.exports = router
