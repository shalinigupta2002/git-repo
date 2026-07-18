import {
  getProductDisplayImageSrc,
  getProductImagePlaceholder,
  parseProductImages,
  resolveProductImageUrl,
} from '../utils/productImage.js'
import { resolveUploadUrl } from '../utils/uploadUrl.js'

describe('productImage utils', () => {
  it('parseProductImages handles array and JSON string', () => {
    expect(parseProductImages([{ url: '/a.jpg' }])).toEqual([{ url: '/a.jpg' }])
    expect(parseProductImages(JSON.stringify([{ url: '/b.jpg' }]))).toEqual([{ url: '/b.jpg' }])
    expect(parseProductImages('not-json')).toEqual([])
  })

  it('resolveProductImageUrl resolves seller upload paths via API origin', () => {
    const url = resolveProductImageUrl({
      id: 'p1',
      source: 'seller',
      imageUrl: '/api/uploads/products/abc.jpg',
    })
    expect(url).toBe(resolveUploadUrl('/api/uploads/products/abc.jpg'))
  })

  it('resolveProductImageUrl passes through absolute and data URLs', () => {
    expect(resolveProductImageUrl({ imageUrl: 'https://cdn.example/x.jpg' })).toBe('https://cdn.example/x.jpg')
    expect(resolveProductImageUrl({ imageUrl: 'data:image/png;base64,abc' })).toBe('data:image/png;base64,abc')
  })

  it('getProductImagePlaceholder is deterministic per product id', () => {
    const a = getProductImagePlaceholder('prod-123')
    const b = getProductImagePlaceholder('prod-123')
    const c = getProductImagePlaceholder('prod-456')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a.startsWith('data:image/svg+xml,')).toBe(true)
    expect(a).not.toContain('picsum')
  })

  it('getProductDisplayImageSrc falls back to placeholder when missing image', () => {
    const src = getProductDisplayImageSrc({ id: 'missing-1' })
    expect(src.startsWith('data:image/svg+xml,')).toBe(true)
  })
})
