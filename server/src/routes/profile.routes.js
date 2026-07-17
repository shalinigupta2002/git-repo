const express = require('express')
const { authenticate } = require('../middleware/authenticate.js')
const { getProfile } = require('../controllers/profileController.js')

const router = express.Router()

router.use(authenticate)
router.get('/', getProfile)

module.exports = router
