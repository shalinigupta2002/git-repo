const { Pool } = require('pg')
const env    = require('../config/env.js')
const logger = require('../config/logger.js')

const pool = new Pool({
  connectionString:     env.databaseUrl,
  max:                  10,
  idleTimeoutMillis:    30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  logger.error({ err }, '[pg] Unexpected idle client error')
})

async function query(text, params) {
  return pool.query(text, params)
}

module.exports = { pool, query }
