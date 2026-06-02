const { Router } = require('express')
const addressController = require('../controllers/addressController.js')
const { authenticate } = require('../middleware/authenticate.js')
const { validate } = require('../middleware/validate.js')
const {
  addressBody,
  updateAddressBody,
  addressIdParam,
} = require('../validators/address.validator.js')

const router = Router()

// All address routes require authentication
router.use(authenticate)

router.get(  '/',     addressController.list)
router.get(  '/:id',  validate(addressIdParam, 'params'), addressController.getById)
router.post( '/',     validate(addressBody),               addressController.create)
router.patch('/:id',  validate(addressIdParam, 'params'), validate(updateAddressBody), addressController.update)
router.delete('/:id', validate(addressIdParam, 'params'), addressController.remove)

module.exports = router
