export const RFQ_ATTACHMENT_ACCEPT =
  '.png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const RFQ_MAX_FILES = 5
export const RFQ_MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const RFQ_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export function isRfqImageType(mimeType) {
  return IMAGE_TYPES.has(String(mimeType || '').toLowerCase())
}

export function validateRfqFile(file) {
  if (!file) return 'Invalid file'
  const mime = String(file.type || '').toLowerCase()
  if (!IMAGE_TYPES.has(mime) && !DOCUMENT_TYPES.has(mime)) {
    return `"${file.name}" is not a supported file type`
  }
  const max = IMAGE_TYPES.has(mime) ? RFQ_MAX_IMAGE_BYTES : RFQ_MAX_DOCUMENT_BYTES
  if (file.size > max) {
    return `"${file.name}" exceeds the ${IMAGE_TYPES.has(mime) ? '5 MB' : '10 MB'} limit`
  }
  return null
}

export function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n)) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
