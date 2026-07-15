'use strict'

const { agent } = require('../../src/__tests__/helpers')

describe('GET /api/health', () => {
  test('200 – returns ok status and version metadata', async () => {
    const res = await agent.get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.version).toBeDefined()
    expect(res.body.data.timestamp).toBeDefined()
  })
})
