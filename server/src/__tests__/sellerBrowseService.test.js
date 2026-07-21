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

describe('sellerBrowseService subcategory filtering', () => {
  const { filterSellerProducts } = require('../services/sellerBrowseService.js')

  const sampleProducts = [
    {
      id: 'p1',
      title: 'PS5 Console',
      description: 'Category: Movies, Music & Video Games > Video Games > Gaming Accessories. Brand: Sony.',
      price: 49999,
    },
    {
      id: 'p2',
      title: 'Fast Charger 65W',
      description: 'Category: Mobile & Accessories > Mobile Accessories. Brand: Anker.',
      price: 1999,
    },
    {
      id: 'p3',
      title: 'Leather Boots',
      description: 'Category: Men\'s Fashion > Footwear > Shoes. Brand: Red Tape.',
      price: 3499,
    },
    {
      id: 'p4',
      title: 'Sci-Fi Novel',
      description: 'Category: Books > Fiction. Brand: Penguin.',
      price: 499,
    },
  ]

  const slugMap = new Map([
    ['movies', 'Movies, Music & Video Games'],
    ['movies-gaming-accessories', 'Gaming Accessories'],
    ['mobiles-mobile-accessories', 'Mobile Accessories'],
    ['mens-fashion-shoes', 'Shoes'],
    ['books-fiction', 'Fiction'],
  ])

  test('product appears in parent category listing', () => {
    const res = filterSellerProducts(sampleProducts, { category: 'movies' }, slugMap)
    expect(res.map((p) => p.id)).toContain('p1')
  })

  test('product appears in selected subcategory listing', () => {
    const res = filterSellerProducts(sampleProducts, { category: 'movies-gaming-accessories' }, slugMap)
    expect(res.map((p) => p.id)).toEqual(['p1'])
  })

  test('subcategories for other categories filter accurately', () => {
    const mobRes = filterSellerProducts(sampleProducts, { category: 'mobiles-mobile-accessories' }, slugMap)
    expect(mobRes.map((p) => p.id)).toEqual(['p2'])

    const shoeRes = filterSellerProducts(sampleProducts, { category: 'mens-fashion-shoes' }, slugMap)
    expect(shoeRes.map((p) => p.id)).toEqual(['p3'])

    const ficRes = filterSellerProducts(sampleProducts, { category: 'books-fiction' }, slugMap)
    expect(ficRes.map((p) => p.id)).toEqual(['p4'])
  })

  test('product does not appear under unrelated subcategories', () => {
    const res = filterSellerProducts(sampleProducts, { category: 'books-fiction' }, slugMap)
    expect(res.map((p) => p.id)).not.toContain('p1')
    expect(res.map((p) => p.id)).not.toContain('p2')
  })
})
