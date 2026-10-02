/**
 * Contact attachment persistence for production deployments.
 *
 * Render (and similar PaaS) use ephemeral filesystems — files in uploads/
 * are lost on redeploy or may be missing on other instances. Every contact upload
 * (images/videos) is mirrored into PostgreSQL; serve falls back to DB when disk is empty.
 */

const fs = require('fs')
const { prisma } = require('../config/database.js')
const env = require('../config/env.js')
const logger = require('../config/logger.js')
const { UPLOAD_DIR } = require('../middleware/contactUpload.js')
const {
  sanitizeUploadFilename,
  resolvePathUnderUploadDir,
} = require('../utils/uploadFilename.js')

async function userCanAccessContactAttachment(user, filename) {
  if (!user) return false
  if (user.role === 'ADMIN') return true

  const safeName = sanitizeUploadFilename(filename)
  if (!safeName) return false

  const pattern = `%${safeName}%`

  const onMessage = await prisma.$queryRaw`
    SELECT cm.id
    FROM contact_messages cm
    WHERE cm.sender_id = ${user.id}
      AND cm.attachments::text ILIKE ${pattern}
    LIMIT 1
  `
  if (Array.isArray(onMessage) && onMessage.length > 0) return true

  const onReply = await prisma.$queryRaw`
    SELECT cm.id
    FROM contact_messages cm
    INNER JOIN contact_message_replies cr ON cr.contact_message_id = cm.id
    WHERE cm.sender_id = ${user.id}
      AND cr.attachments::text ILIKE ${pattern}
    LIMIT 1
  `
  return Array.isArray(onReply) && onReply.length > 0
}

async function persistUploadedContactFiles(files = [], db = prisma) {
  if (!files || !files.length) return

  for (const file of files) {
    if (!file?.filename || !file.path) continue
    try {
      if (!fs.existsSync(file.path)) continue
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
    } catch (err) {
      logger.error({ filename: file.filename, err }, 'Failed to persist contact file to DB')
    }
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

async function serveContactAttachment(filename, res) {
  const safeName = sanitizeUploadFilename(filename)
  const logCtx = { filename: safeName || String(filename || '') }

  try {
    if (!safeName) {
      logger.warn(logCtx, 'Contact attachment serve: invalid filename')
      return false
    }

    const diskPath = resolvePathUnderUploadDir(UPLOAD_DIR, safeName)
    if (!diskPath) {
      logger.warn(logCtx, 'Contact attachment serve: path rejected')
      return false
    }

    const diskExists = fs.existsSync(diskPath)
    logCtx.diskExists = diskExists

    if (diskExists) {
      res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
      await new Promise((resolve, reject) => {
        res.sendFile(diskPath, (err) => (err ? reject(err) : resolve()))
      })
      logger.info(logCtx, 'Contact attachment served from disk')
      return true
    }

    const record = await prisma.uploadedFile.findUnique({ where: { key: safeName } })
    logCtx.rowFound = Boolean(record)
    logCtx.mimeType = record?.mimeType ?? null
    logCtx.blobLength = blobLength(record?.data)

    if (!record) {
      logger.warn(logCtx, 'Contact attachment serve: not found on disk or DB')
      return false
    }

    const body = toBuffer(record.data)
    logCtx.blobLength = body.length

    res.set('Content-Type', record.mimeType || 'application/octet-stream')
    res.set('Cache-Control', env.isProd ? 'public, max-age=604800, immutable' : 'no-cache')
    res.send(body)
    logger.info(logCtx, 'Contact attachment served from DB')
    return true
  } catch (err) {
    logger.error({ ...logCtx, err }, 'Contact attachment serve failed')
    throw err
  }
}

module.exports = {
  persistUploadedContactFiles,
  serveContactAttachment,
  userCanAccessContactAttachment,
}
