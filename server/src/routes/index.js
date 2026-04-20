const { Router } = require('express')
const authRoutes = require('./auth.routes.js')
const productRoutes = require('./product.routes.js')
const orderRoutes = require('./order.routes.js')
const adminRoutes = require('./admin.routes.js')

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/orders', orderRoutes)
router.use('/admin', adminRoutes)

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } })
})

module.exports = router
