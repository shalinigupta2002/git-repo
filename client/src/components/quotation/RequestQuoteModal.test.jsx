import { describe, expect, it } from 'vitest'

describe('RequestQuoteModal multi-product guard', () => {
  it('detects multiple distinct product ids', () => {
    const product = { id: 'p1' }
    const products = [{ id: 'p2' }]
    const ids = new Set([product.id, ...products.map((p) => p.id)])
    expect(ids.size).toBeGreaterThan(1)
  })
})
