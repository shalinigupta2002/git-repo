const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const { AppError } = require('../utils/AppError.js')
const {
  sanitizeDisplayFilename,
  validateRfqUploadFile,
  runOptionalVirusScan,
} = require('../utils/rfqFileValidation.js')

const UPLOAD_DIR = path.join(__dirname, '../../uploads/rfq')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const MAX_FILES = 5

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/jpg'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(sanitizeDisplayFilename(file.originalname)).toLowerCase()
    const safeExt = ext && ext.length <= 8 ? ext : ''
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${safeExt}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_BYTES,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    try {
      validateRfqUploadFile(file)
      cb(null, true)
    } catch (error) {
      cb(error instanceof AppError ? error : new AppError(error.message || 'Upload rejected', 400))
    }
  },
})

function rfqUploadMiddleware(req, res, next) {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next()

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Images up to 5 MB, documents up to 10 MB.', 400))
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError(`Too many files. Up to ${MAX_FILES} attachments allowed.`, 400))
    }
    return next(err instanceof AppError ? err : new AppError(err.message || 'Upload failed', 400))
  })
}

async function buildRfqAttachments(files = []) {
  const attachments = []

  for (const file of files) {
    const header = await fs.promises.readFile(file.path, { encoding: null }).then((buf) => buf.subarray(0, 8))
    const validated = validateRfqUploadFile(file, { readHeaderBytes: header })
    const resolvedMime = validated.resolvedMime || file.mimetype
    const isImage = IMAGE_MIMES.has(resolvedMime)
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES

    if (file.size > maxBytes) {
      throw new AppError(
        `"${validated.safeName}" exceeds the ${isImage ? '5 MB' : '10 MB'} limit`,
        400,
      )
    }

    await runOptionalVirusScan(file.path, { name: validated.safeName, mime: resolvedMime })

    attachments.push({
      name: validated.safeName,
      url: `/api/quote-requests/attachments/file/${file.filename}`,
      mimeType: resolvedMime,
      sizeBytes: file.size,
    })
  }

  return attachments
}

module.exports = {
  rfqUploadMiddleware,
  buildRfqAttachments,
  UPLOAD_DIR,
  MAX_FILES,
}
