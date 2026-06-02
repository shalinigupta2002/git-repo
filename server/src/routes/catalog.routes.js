/**
 * Catalog routes — mounted at /api/catalog
 *
 * All routes are public (no authentication).
 * These serve the browse-only reference catalog (catalog.* schema).
 *
 * Distinct from /api/products which requires auth and drives B2B transactions.
 */
const { Router } = require('express')
const catalogController = require('../controllers/catalogController.js')

const router = Router()

// GET /api/catalog/products[?q=&category=&brand=&cursor=&limit=]
router.get('/products',   catalogController.listProducts)

// GET /api/catalog/categories
router.get('/categories', catalogController.listCategories)

// GET /api/catalog/brands
router.get('/brands',     catalogController.listBrands)

module.exports = router
