/**
 * One-off diagnostic: trace product image lifecycle in DB + disk.
 * Usage: node scripts/diagnose-product-image.js [productId]
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { UPLOAD_DIR } = require('../src/middleware/productUpload.js')

const productId = process.argv[2] || 'b6463947-1fb8-4d87-9653-fdc806e7623b'
const prisma = new PrismaClient()

async function tableExists(name) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function main() {
  console.log('=== Product image lifecycle diagnostic ===')
  console.log('Product ID:', productId)
  console.log('NODE_ENV:', process.env.NODE_ENV || '(unset)')
  console.log('UPLOAD_DIR:', UPLOAD_DIR)
  console.log('')

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    console.log('1. Product in DB: NO')
    return
  }

  console.log('1. Product in DB: YES')
  console.log('   name:', product.name)
  console.log('   createdAt:', product.createdAt.toISOString())

  const images = product.images
  console.log('')
  console.log('2. images JSON in DB:', JSON.stringify(images, null, 2))

  const imageUrl = Array.isArray(images)
    ? images.find((i) => i?.url)?.url ?? null
    : null
  console.log('')
  console.log('3. First image URL from DB:', imageUrl ?? 'NULL')

  const filename = imageUrl ? path.basename(imageUrl) : null
  if (filename) {
    const diskPath = path.join(UPLOAD_DIR, filename)
    const diskExists = fs.existsSync(diskPath)
    console.log('')
    console.log('4. Disk file exists locally:', diskExists ? 'YES' : 'NO', diskPath)
  }

  const hasUploadedFiles = await tableExists('uploaded_files')
  console.log('')
  console.log('5. uploaded_files table exists:', hasUploadedFiles ? 'YES' : 'NO')

  if (hasUploadedFiles && filename) {
    const blob = await prisma.uploadedFile.findUnique({ where: { key: filename } })
    console.log('')
    console.log('6. uploaded_files row for key', filename + ':', blob ? 'YES' : 'NO')
    if (blob) {
      const bytes = Buffer.isBuffer(blob.data) ? blob.data.length : 0
      console.log('   mimeType:', blob.mimeType)
      console.log('   blob size bytes:', bytes)
      console.log('   blob null/empty:', bytes === 0 ? 'YES' : 'NO')
    } else {
      console.log('   blob: MISSING (no row)')
    }

    const total = await prisma.uploadedFile.count()
    console.log('')
    console.log('7. Total rows in uploaded_files:', total)
  }

  console.log('')
  console.log('=== API-equivalent imageUrl (catalog) ===')
  console.log(imageUrl ?? 'null')
}

main()
  .catch((err) => {
    console.error('Diagnostic failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
