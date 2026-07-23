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
    console.log('Querying database migrations...')
    const dbMigrations = await prisma.$queryRawUnsafe('SELECT id, checksum, migration_name FROM _prisma_migrations')
    console.log(`Found ${dbMigrations.length} migrations in database.`)

    const migrationsDir = path.join(__dirname, '../prisma/migrations')

    for (const m of dbMigrations) {
      const localPath = path.join(migrationsDir, m.migration_name, 'migration.sql')
      if (!fs.existsSync(localPath)) {
        console.log(`[Missing] ${m.migration_name} not found locally.`)
        continue
      }

      const content = fs.readFileSync(localPath, 'utf8')
      const lfContent = content.replace(/\r\n/g, '\n')
      const crlfContent = lfContent.replace(/\n/g, '\r\n')

      const localLfChecksum = computeSha256(lfContent)
      const localCrlfChecksum = computeSha256(crlfContent)
      const localAsIsChecksum = computeSha256(content)
      const dbChecksum = m.checksum

      if (dbChecksum === localLfChecksum || dbChecksum === localCrlfChecksum || dbChecksum === localAsIsChecksum) {
        console.log(`[Match] ${m.migration_name}`)
      } else {
        console.log(`[Mismatch] ${m.migration_name}`)
        console.log(`  Database Checksum: ${dbChecksum}`)
        console.log(`  Local LF:          ${localLfChecksum}`)
        console.log(`  Local CRLF:        ${localCrlfChecksum}`)
        console.log(`  Local As-Is:       ${localAsIsChecksum}`)
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
