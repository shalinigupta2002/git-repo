const { Router } = require('express')
const { authenticate, optionalAuth } = require('../middleware/authenticate.js')
const { requireIntegrationApi } = require('../middleware/requireIntegrationApi.js')
const { validate } = require('../middleware/validate.js')
const { userIdParam, supplierIdParam } = require('../validators/common.validator.js')
const ctrl = require('../controllers/integrationController.js')

const router = Router()

router.use(requireIntegrationApi)

// Catalog endpoints (Public / Optional Auth)
router.get('/products', optionalAuth, ctrl.listProducts)
router.get('/products/:productId', optionalAuth, ctrl.getProductById)
router.get('/products/:productId/eligible-sellers', optionalAuth, ctrl.getProductEligibleSellers)
router.get('/categories', optionalAuth, ctrl.listCategories)

// Directory and Subscription endpoints (Requires Auth)
router.get('/users/eligible', authenticate, ctrl.getEligibleUsers)
router.get('/sellers/eligible', authenticate, ctrl.getEligibleSellers)
router.post('/subscriptions/validate', authenticate, ctrl.validateSubscription)
router.get('/users/:userId/profile', authenticate, validate(userIdParam, 'params'), ctrl.getUserProfile)

// Secure Supplier profile (Requires Auth and Context Header)
router.get(
  '/suppliers/:supplierId/profile',
  authenticate,
  validate(supplierIdParam, 'params'),
  ctrl.getSupplierProfile,
)

module.exports = router
