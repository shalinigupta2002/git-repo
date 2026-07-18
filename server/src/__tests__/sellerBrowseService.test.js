const { mapSellerProduct } = require('../services/sellerBrowseService.js')

describe('sellerBrowseService image mapping', () => {
  test('mapSellerProduct reads first image from JSON string images field', () => {
    const mapped = mapSellerProduct({
      id: 'p1',
      name: 'Widget',
      description: 'Category: Electronics. Brand: Acme.',
      price: 100,
      images: JSON.stringify([{ type: 'image', url: '/api/uploads/products/x.jpg' }]),
      seller: null,
      createdAt: new Date(),
      stockQty: 1,
      moq: 1,
      currency: 'INR',
    })

    expect(mapped.imageUrl).toBe('/api/uploads/products/x.jpg')
  })

  test('mapSellerProduct returns null imageUrl when images empty', () => {
    const mapped = mapSellerProduct({
      id: 'p2',
      name: 'Widget',
      description: null,
      price: 50,
      images: [],
      seller: null,
      createdAt: new Date(),
      stockQty: 0,
      moq: 1,
      currency: 'INR',
    })

    expect(mapped.imageUrl).toBeNull()
  })
})
