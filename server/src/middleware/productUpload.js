const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const multer = require('multer')
const { AppError } = require('../utils/AppError.js')

const UPLOAD_DIR = path.join(__dirname, '../../uploads/products')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const safeExt = ext && ext.length <= 8 ? ext : ''
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_TYPES.has(file.mimetype)) {
      return cb(new AppError('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed', 400))
    }
    cb(null, true)
  },
})

function productUploadMiddleware(req, res, next) {
  upload.array('images', 10)(req, res, (err) => {
    if (!err) return next()

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Image too large. Maximum size is 5 MB per file.', 400))
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Too many images. Up to 10 images allowed.', 400))
    }
    return next(err instanceof AppError ? err : new AppError(err.message || 'Upload failed', 400))
  })
}

function buildProductImages(files = []) {
  const images = []

  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AppError(`Image "${file.originalname}" exceeds 5 MB limit`, 400)
    }
    images.push({
      type: 'image',
      url: `/api/uploads/products/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
    })
  }

  return images
}

module.exports = {
  productUploadMiddleware,
  buildProductImages,
  UPLOAD_DIR,
}
