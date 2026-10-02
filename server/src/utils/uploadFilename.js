'use strict'

const path = require('path')

/** Matches multer output: timestamp + hex (+ optional short ext). */
const SAFE_UPLOAD_FILENAME = /^[a-zA-Z0-9._-]+$/

function sanitizeUploadFilename(filename) {
  const base = path.basename(String(filename || ''))
  if (!base || !SAFE_UPLOAD_FILENAME.test(base)) return null
  return base
}

/**
 * Resolve a path under uploadDir; returns null if the result escapes the root.
 */
function resolvePathUnderUploadDir(uploadDir, safeFilename) {
  const root = path.resolve(uploadDir)
  const resolved = path.resolve(root, safeFilename)
  if (resolved === root) return null
  if (!resolved.startsWith(`${root}${path.sep}`)) return null
  return resolved
}

module.exports = {
  SAFE_UPLOAD_FILENAME,
  sanitizeUploadFilename,
  resolvePathUnderUploadDir,
}
