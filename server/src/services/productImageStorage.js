/**
 * Product image persistence for production deployments.
 *
 * Render (and similar PaaS) use ephemeral filesystems — files in uploads/
 * are lost on redeploy or may be missing on other instances. Every upload
 * is mirrored into PostgreSQL; serve falls back to DB when disk is empty.
 */

const fs = require('fs')
const path = require('path')
const { prisma } = require('../config/database.js')
const env = require('../config/env.js')
const logger = require('../config/logger.js')
const { UPLOAD_DIR } = require('../middleware/productUpload.js')

async function persistUploadedProductFiles(files = [], db = prisma) {
  if (!files.length) return

  for (const file of files) {
    if (!file?.filename || !file.path) continue

    const buffer = fs.readFileSync(file.path)
    await db.uploadedFile.upsert({
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

function blobLength(data) {
  if (data == null) return 0
  if (Buffer.isBuffer(data)) return data.length
  if (data instanceof Uint8Array) return data.byteLength
  if (typeof data === 'string') return Buffer.byteLength(data)
  return 0
}

function toBuffer(data) {
  if (data == null) return Buffer.alloc(0)
  if (Buffer.isBuffer(data)) return data
  return Buffer.from(data)
}

async function serveProductImage(filename, res) {
  const safeName = path.basename(String(filename || ''))
  const logCtx = { filename: safeName }

  try {
    if (!safeName) {
      logger.warn(logCtx, 'Product image serve: empty filename')
      return false
    }

    const diskPath = path.resolve(UPLOAD_DIR, safeName)
    const diskExists = fs.existsSync(diskPath)
    logCtx.diskExists = diskExists
    logCtx.diskPath = diskPath

    if (diskExists) {
      res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
      await new Promise((resolve, reject) => {
        res.sendFile(diskPath, (err) => (err ? reject(err) : resolve()))
      })
      logger.info(logCtx, 'Product image served from disk')
      return true
    }

    const record = await prisma.uploadedFile.findUnique({ where: { key: safeName } })
    logCtx.rowFound = Boolean(record)
    logCtx.mimeType = record?.mimeType ?? null
    logCtx.blobLength = blobLength(record?.data)

    if (!record) {
      logger.warn(logCtx, 'Product image serve: not found on disk or DB')
      return false
    }

    const body = toBuffer(record.data)
    logCtx.blobLength = body.length

    res.set('Content-Type', record.mimeType || 'application/octet-stream')
    res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
    res.send(body)
    logger.info(logCtx, 'Product image served from DB')
    return true
  } catch (err) {
    logger.error({ ...logCtx, err }, 'Product image serve failed')
    throw err
  }
}

module.exports = {
  persistUploadedProductFiles,
  serveProductImage,
}
