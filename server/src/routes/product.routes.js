const { Router } = require('express')
const productController = require('../controllers/productController.js')
const { authenticate, optionalAuth, authorize } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  createProductBody,
  updateProductBody,
  listProductsQuery,
  productIdParam,
} = require('../validators/product.validator.js')

const router = Router()

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

router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(createProductBody),
  productController.create,
)

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

module.exports = router
