const { Router } = require('express')
const productController = require('../controllers/productController.js')
const { authenticate, optionalAuth, authorize } = require('../middleware/authenticate.js')
const { productUploadMiddleware } = require('../middleware/productUpload.js')
const { validate } = require('../middleware/validate.js')
const {
  createProductBody,
  updateProductBody,
  listProductsQuery,
  productIdParam,
  stockAdjustBody,
} = require('../validators/product.validator.js')

const router = Router()

// Public browsing — no subscription required to view the catalogue
router.get(
  '/',
  optionalAuth,
  validate(listProductsQuery, 'query'),
  productController.list,
)

router.get(
  '/:id',
  optionalAuth,
  validate(productIdParam, 'params'),
  productController.getById,
)

// Creating a product is free — sellers can list without a subscription.
router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  productUploadMiddleware,
  validate(createProductBody),
  productController.create,
)

// Updating and deleting only require ownership — not an active subscription
// so sellers can still manage existing listings if their plan has lapsed.
router.patch(
  '/:id',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(productIdParam, 'params'),
  validate(updateProductBody),
  productController.update,
)

router.delete(
  '/:id',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(productIdParam, 'params'),
  productController.remove,
)

// ── Inventory management ──────────────────────────────────────────────────────

/** Manually add/remove stock (RESTOCK or ADJUSTMENT reasons only). */
router.post(
  '/:id/stock',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(productIdParam, 'params'),
  validate(stockAdjustBody),
  productController.stockAdjust,
)

/** Full stock-movement history for a product (seller/admin only). */
router.get(
  '/:id/inventory-logs',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(productIdParam, 'params'),
  productController.inventoryLogs,
)

module.exports = router
