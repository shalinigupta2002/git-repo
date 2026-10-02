'use strict'

jest.mock('../../src/config/database')

const { agent } = require('../../src/__tests__/helpers')

describe('Integration API gate', () => {
  test('returns 404 INTEGRATION_DISABLED when integration API is off', async () => {
    jest.isolateModules(() => {
      process.env.INTEGRATION_API_ENABLED = 'false'
      const app = require('../../src/app')
      const request = require('supertest')(app)

      return request.get('/api/v1/integrations/categories').then((res) => {
        expect(res.status).toBe(404)
        expect(res.body.error.code).toBe('INTEGRATION_DISABLED')
      })
    })
  })
})

describe('Integration API when enabled', () => {
  test('GET /api/v1/integrations/products is reachable', async () => {
    const { prisma } = require('../../src/config/database')
    prisma.product.findMany.mockResolvedValue([])
    prisma.product.count.mockResolvedValue(0)

    const res = await agent.get('/api/v1/integrations/products')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
