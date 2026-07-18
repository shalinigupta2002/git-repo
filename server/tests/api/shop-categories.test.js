'use strict'

jest.mock('../../src/services/shopCategoryDbService.js', () => ({
  fetchActiveCategoryTree: jest.fn(async () => [
    {
      id: 'electronics',
      label: 'Electronics',
      slug: 'electronics',
      children: [
        { id: 'mobiles', label: 'Mobile & Accessories', slug: 'mobiles', children: [] },
      ],
    },
  ]),
  ensureDefaultCategories: jest.fn(),
  buildTree: jest.fn(),
}))

const { agent } = require('../../src/__tests__/helpers')

describe('GET /api/shop-categories', () => {
  test('200 – route is registered and returns { success, data.tree }', async () => {
    const res = await agent.get('/api/shop-categories')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.tree)).toBe(true)
    expect(res.body.data.tree[0].label).toBe('Electronics')
    expect(res.body.data.tree[0].children[0].label).toBe('Mobile & Accessories')
    expect(res.headers['cache-control']).toMatch(/no-store/i)
  })

  test('must not 404 – regression guard for missing route mount', async () => {
    const res = await agent.get('/api/shop-categories')

    expect(res.status).not.toBe(404)
    expect(res.body.error?.code).not.toBe('NOT_FOUND')
  })
})
