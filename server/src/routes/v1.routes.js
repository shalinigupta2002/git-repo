const { Router } = require('express')
const catalogProductRoutes = require('./catalogProduct.routes.js')

const router = Router()

router.use('/products', catalogProductRoutes)

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } })
})

module.exports = router
