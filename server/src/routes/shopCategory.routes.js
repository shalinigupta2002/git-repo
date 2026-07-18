const { Router } = require('express')
const { optionalAuth } = require('../middleware/authenticate.js')
const ctrl = require('../controllers/shopCategoryController.js')

const router = Router()

router.get('/', optionalAuth, ctrl.listShopCategories)

module.exports = router
