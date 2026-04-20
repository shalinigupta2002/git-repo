const { Router } = require('express')
const catalogProductController = require('../controllers/catalogProductController.js')

const router = Router()

// GET /api/v1/products
router.get('/', catalogProductController.listProducts)

module.exports = router
