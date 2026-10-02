'use strict'

jest.mock('../../src/config/database')

const { agent } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

describe('GET /api/health', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockResolvedValue([{ ok: 1 }])
  })

  test('200 – returns ok status and version metadata', async () => {
    const res = await agent.get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.database).toBe('ok')
    expect(res.body.data.monitoring).toBeDefined()
    expect(res.body.data.version).toBeDefined()
    expect(res.body.data.timestamp).toBeDefined()
  })
})
