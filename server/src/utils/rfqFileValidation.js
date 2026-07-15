'use strict'

const path = require('path')
const { AppError } = require('./AppError.js')

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.ps1', '.sh', '.bash',
  '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.php', '.py', '.rb', '.jar',
  '.dll', '.so', '.dylib', '.html', '.htm', '.svg', '.xml',
])

const EXTENSION_TO_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const MAGIC_SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'application/msword', bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { mime: 'application/vnd.ms-excel', bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: [0x50, 0x4b, 0x03, 0x04] },
]

function sanitizeDisplayFilename(name) {
  const base = path.basename(String(name || 'attachment'))
  return base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 255) || 'attachment'
}

function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.bytes.every((byte, index) => buffer[index] === byte)) {
      return sig.mime
    }
  }
  return null
}

function expectedMimeFromFilename(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase()
  return EXTENSION_TO_MIME[ext] || null
}

function assertAllowedExtension(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase()
  if (!ext || BLOCKED_EXTENSIONS.has(ext)) {
    throw new AppError('Executable or unsupported file types are not allowed', 400, 'VALIDATION_ERROR')
  }
  if (!EXTENSION_TO_MIME[ext]) {
    throw new AppError('Only PNG, JPG, JPEG, PDF, DOC, DOCX, XLS, and XLSX files are allowed', 400, 'VALIDATION_ERROR')
  }
}

function validateRfqUploadFile(file, { readHeaderBytes = null } = {}) {
  if (!file) {
    throw new AppError('Invalid upload file', 400, 'VALIDATION_ERROR')
  }

  assertAllowedExtension(file.originalname)

  const expectedFromName = expectedMimeFromFilename(file.originalname)
  const header = readHeaderBytes || (file.buffer ? file.buffer.subarray(0, 8) : null)
  const detected = header ? detectMimeFromBuffer(header) : null

  if (detected && expectedFromName && detected !== expectedFromName) {
    // Office Open XML formats share PK header — allow docx/xlsx when extension matches office zip.
    const bothOfficeZip = detected.includes('openxmlformats') || expectedFromName.includes('openxmlformats')
    const bothOle = detected === 'application/msword' && expectedFromName === 'application/vnd.ms-excel'
    if (!bothOfficeZip && !bothOle && detected.split('/')[0] !== expectedFromName.split('/')[0]) {
      throw new AppError(
        `File content does not match extension for "${sanitizeDisplayFilename(file.originalname)}"`,
        400,
        'VALIDATION_ERROR',
      )
    }
  }

  if (detected && file.mimetype && detected !== file.mimetype) {
    const clientTrusted = expectedFromName && detected === expectedFromName
    if (!clientTrusted) {
      throw new AppError('File MIME type mismatch — upload rejected for safety', 400, 'VALIDATION_ERROR')
    }
  }

  return {
    safeName: sanitizeDisplayFilename(file.originalname),
    resolvedMime: detected || expectedFromName || file.mimetype,
  }
}

/**
 * Optional hook for external virus scanning (ClamAV, cloud AV, etc.).
 * Default implementation is a no-op in production until wired by DevOps.
 */
async function runOptionalVirusScan(_filePath, _meta = {}) {
  if (process.env.RFQ_VIRUS_SCAN_URL) {
    // Integration point — fail closed when explicitly enabled without scanner wired.
    throw new AppError('Virus scanning is enabled but not configured on this server', 503, 'SCAN_UNAVAILABLE')
  }
  return { clean: true }
}

module.exports = {
  sanitizeDisplayFilename,
  validateRfqUploadFile,
  detectMimeFromBuffer,
  runOptionalVirusScan,
  BLOCKED_EXTENSIONS,
}
