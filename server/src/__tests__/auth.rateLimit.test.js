'use strict'

/**
 * Isolated Express app so rate-limit counters do not affect the shared test app.
 * Limiter settings mirror server/src/routes/auth.routes.js authLimiter.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const supertest = require('supertest')

describe('auth login rate limit', () => {
  test('429 after max attempts', async () => {
    const app = express()
    const authLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
    })
    app.post('/login', authLimiter, (_req, res) => {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS' } })
    })

    const agent = supertest(app)
    let lastRes = null
    for (let i = 0; i < 51; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastRes = await agent.post('/login')
    }

    expect(lastRes.status).toBe(429)
    expect(lastRes.headers['ratelimit-limit']).toBe('50')
  }, 15_000)
})
