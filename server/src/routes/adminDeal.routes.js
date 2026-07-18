const { Router } = require('express')
const adminDealController = require('../controllers/adminDealController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  adminListDealsQuery,
  dealIdParam,
  chargeConfigIdParam,
  updateDealChargeConfigBody,
} = require('../validators/deal.validator.js')

const router = Router()

router.use(authenticate, authorize('ADMIN'))

router.get('/deals', validate(adminListDealsQuery, 'query'), adminDealController.listDeals)
router.get('/deals/:dealId', validate(dealIdParam, 'params'), adminDealController.getDealById)
router.get('/deal-charge-configs', adminDealController.listChargeConfigs)
router.put(
  '/deal-charge-configs/:id',
  validate(chargeConfigIdParam, 'params'),
  validate(updateDealChargeConfigBody),
  adminDealController.updateChargeConfig,
)

module.exports = router
