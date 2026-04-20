const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

function required(name) {
  const v = process.env[name]
  if (!v || String(v).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v
}

const nodeEnv = process.env.NODE_ENV || 'development'

module.exports = {
  nodeEnv,
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}
