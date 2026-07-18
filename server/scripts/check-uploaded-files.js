const { PrismaClient } = require('@prisma/client')
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT key, octet_length(data) AS size, mime_type
    FROM uploaded_files
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log(JSON.stringify(rows, (_, v) => (typeof v === 'bigint' ? Number(v) : v), 2))

  const key = '1784388262298-08eeb616349b8a79.png'
  const row = await prisma.uploadedFile.findUnique({ where: { key } })
  if (row) {
    console.log('\nPrisma findUnique for', key)
    console.log('mimeType:', row.mimeType)
    console.log('data type:', row.data?.constructor?.name)
    console.log('data length:', row.data?.length)
    console.log('isBuffer:', Buffer.isBuffer(row.data))
  } else {
    console.log('\nNo Prisma row for', key)
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
