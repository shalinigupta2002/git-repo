/**
 * Product image persistence for production deployments.
 *
 * Render (and similar PaaS) use ephemeral filesystems — files in uploads/
 * are lost on redeploy or may be missing on other instances. In production
 * we mirror each uploaded file into PostgreSQL and serve from DB when the
 * local file is absent.
 */

const fs = require('fs')
const path = require('path')
const { prisma } = require('../config/database.js')
const { env } = require('../config/env.js')
const { UPLOAD_DIR } = require('../middleware/productUpload.js')

async function persistUploadedProductFiles(files = []) {
  if (!env.isProd || !files.length) return

  for (const file of files) {
    if (!file?.filename || !file.path) continue

    const buffer = fs.readFileSync(file.path)
    await prisma.uploadedFile.upsert({
      where: { key: file.filename },
      create: {
        key: file.filename,
        mimeType: file.mimetype || 'application/octet-stream',
        data: buffer,
      },
      update: {
        mimeType: file.mimetype || 'application/octet-stream',
        data: buffer,
      },
    })
  }
}

async function serveProductImage(filename, res) {
  const safeName = path.basename(String(filename || ''))
  if (!safeName) return false

  const diskPath = path.join(UPLOAD_DIR, safeName)
  if (fs.existsSync(diskPath)) {
    res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
    res.sendFile(diskPath)
    return true
  }

  const record = await prisma.uploadedFile.findUnique({ where: { key: safeName } })
  if (!record) return false

  res.set('Content-Type', record.mimeType || 'application/octet-stream')
  res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
  res.send(Buffer.from(record.data))
  return true
}

module.exports = {
  persistUploadedProductFiles,
  serveProductImage,
}
