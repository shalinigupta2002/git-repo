const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('../controllers/authController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const { registerBody, loginBody } = require('../validators/auth.validator.js')

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', authLimiter, validate(registerBody), authController.register)
router.post('/login', authLimiter, validate(loginBody), authController.login)
router.get('/me', authenticate, authController.me)

module.exports = router
