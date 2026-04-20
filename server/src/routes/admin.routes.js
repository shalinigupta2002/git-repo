const { Router } = require('express')
const adminController = require('../controllers/adminController.js')
const { authenticate, authorize } = require('../middleware/authenticate.js')

const router = Router()

router.use(authenticate, authorize('ADMIN'))

router.get('/buyers', adminController.listBuyers)
router.get('/sellers', adminController.listSellers)
router.get('/transactions', adminController.listTransactions)
router.get('/stats', adminController.stats)

module.exports = router
