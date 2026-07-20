const { Router } = require('express')
const sellerDealController = require('../controllers/sellerDealController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { authorizeWorkspace } = require('../middleware/requireSubscription.js')
const { requireSellerDealCapability } = require('../middleware/requireDealCapability.js')
const { validate } = require('../middleware/validate.js')
const { listDealsQuery, dealIdParam, verifyDealPaymentBody } = require('../validators/deal.validator.js')

const router = Router()

router.use(authenticate, authorizeWorkspace('SELLER'), requireSellerDealCapability)

router.get('/', validate(listDealsQuery, 'query'), sellerDealController.list)
router.get('/:dealId', validate(dealIdParam, 'params'), sellerDealController.getById)
router.post('/:dealId/pay/order', validate(dealIdParam, 'params'), sellerDealController.createPayOrder)
router.post('/:dealId/pay/verify', validate(dealIdParam, 'params'), validate(verifyDealPaymentBody), sellerDealController.verifyPay)
router.post('/:dealId/pay', validate(dealIdParam, 'params'), sellerDealController.pay)

module.exports = router
