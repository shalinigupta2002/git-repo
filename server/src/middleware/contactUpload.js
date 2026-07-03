const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const multer = require('multer')
const { AppError } = require('../utils/AppError.js')

const UPLOAD_DIR = path.join(__dirname, '../../uploads/contact')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 25 * 1024 * 1024

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
    fileSize: MAX_VIDEO_BYTES,
    files: 7,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = IMAGE_TYPES.has(file.mimetype) || VIDEO_TYPES.has(file.mimetype)
    if (!allowed) {
      return cb(new AppError('Only image (JPG, PNG, WEBP, GIF) and video (MP4, WEBM, MOV) files are allowed', 400))
    }
    cb(null, true)
  },
})

function contactUploadMiddleware(req, res, next) {
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 },
  ])(req, res, (err) => {
    if (!err) return next()

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Images up to 5 MB, videos up to 25 MB.', 400))
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Too many files. Up to 5 images and 2 videos allowed.', 400))
    }
    return next(err instanceof AppError ? err : new AppError(err.message || 'Upload failed', 400))
  })
}

function buildContactAttachments(files = {}) {
  const attachments = []
  const images = files.images || []
  const videos = files.videos || []

  for (const file of images) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AppError(`Image "${file.originalname}" exceeds 5 MB limit`, 400)
    }
    attachments.push({
      type: 'image',
      url: `/api/uploads/contact/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
    })
  }

  for (const file of videos) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new AppError(`Video "${file.originalname}" exceeds 25 MB limit`, 400)
    }
    attachments.push({
      type: 'video',
      url: `/api/uploads/contact/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
    })
  }

  return attachments
}

module.exports = {
  contactUploadMiddleware,
  buildContactAttachments,
  UPLOAD_DIR,
}
