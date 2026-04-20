const { Pool } = require('pg')
const env = require('../config/env.js')

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('[pg] unexpected idle client error', err)
})

async function query(text, params) {
  return pool.query(text, params)
}

module.exports = { pool, query }
