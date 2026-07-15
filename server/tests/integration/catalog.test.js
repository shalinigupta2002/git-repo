'use strict'

jest.mock('../../src/services/sellerBrowseService.js', () => ({
  listSellerProducts: jest.fn(async () => ({
    products: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        title: 'Catalog Product',
        price: 1000,
        seller: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', city: 'Mumbai' },
      },
    ],
    nextCursor: null,
  })),
  getSellerProductById: jest.fn(async (id) => ({
    id,
    title: 'Catalog Product',
    price: 1000,
    seller: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', city: 'Mumbai' },
  })),
}))

const { agent } = require('../../src/__tests__/helpers')

describe('Catalog integration', () => {
  test('GET /api/catalog/products returns public product list', async () => {
    const res = await agent.get('/api/catalog/products?limit=5')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.products)).toBe(true)
    expect(res.body.data.products[0].title).toBe('Catalog Product')
  })

  test('GET /api/catalog/products/:id returns single product', async () => {
    const res = await agent.get('/api/catalog/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')

    expect(res.status).toBe(200)
    expect(res.body.data.product.id).toBe('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
  })

  test('GET /api/catalog/categories returns category list', async () => {
    const res = await agent.get('/api/catalog/categories')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
