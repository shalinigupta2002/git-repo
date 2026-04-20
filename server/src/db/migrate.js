/**
 * Catalog migration + seed runner.
 *
 * Usage:
 *   node src/db/migrate.js          -> runs migrations only
 *   node src/db/migrate.js --seed   -> runs migrations and then seeds sample data
 */

const fs = require('fs')
const path = require('path')
const { pool } = require('./pool.js')

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')
const SEEDS_DIR = path.join(__dirname, 'seeds')

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  await client.query(sql)
}

async function runMigrations(client) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const full = path.join(MIGRATIONS_DIR, file)
    console.log(`[migrate] applying ${file}`)
    await runSqlFile(client, full)
  }
}

async function runSeeds(client) {
  const files = fs
    .readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const full = path.join(SEEDS_DIR, file)
    console.log(`[seed] applying ${file}`)
    await runSqlFile(client, full)
  }
}

async function main() {
  const shouldSeed = process.argv.includes('--seed')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await runMigrations(client)
    if (shouldSeed) {
      await runSeeds(client)
    }
    await client.query('COMMIT')
    console.log('[done] catalog migration complete')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[error] migration failed:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
