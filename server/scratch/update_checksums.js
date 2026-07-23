'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { prisma } = require('../src/config/database.js')

function computeSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function run() {
  try {
    const migrationsDir = path.join(__dirname, '../prisma/migrations')

    const targets = [
      '20260718170000_deal_management_finalize',
      '20260722153000_product_uom_user_soft_delete'
    ]

    for (const name of targets) {
      const localPath = path.join(migrationsDir, name, 'migration.sql')
      if (!fs.existsSync(localPath)) {
        console.error(`Local migration file for ${name} not found!`)
        continue
      }

      const content = fs.readFileSync(localPath, 'utf8')
      const checksum = computeSha256(content)

      console.log(`Updating database checksum for ${name} to: ${checksum}`)
      await prisma.$executeRawUnsafe(
        'UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = $2',
        checksum,
        name
      )
    }

    console.log('Database checksums updated successfully.')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
