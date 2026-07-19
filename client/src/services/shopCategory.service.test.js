import { describe, expect, it, vi, beforeEach } from 'vitest'

const apiGet = vi.fn()

vi.mock('./api.js', () => ({
  api: {
    get: (...args) => apiGet(...args),
  },
}))

vi.mock('../utils/apiError.js', () => ({
  throwFriendly: (err) => {
    throw err
  },
}))

describe('fetchShopCategories', () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it('does not send Cache-Control request header (avoids cross-origin preflight mismatch)', async () => {
    apiGet.mockResolvedValue({
      data: { success: true, data: { tree: [{ id: 'electronics', label: 'Electronics', children: [] }] } },
    })

    const { fetchShopCategories } = await import('./shopCategory.service.js')
    await fetchShopCategories()

    expect(apiGet).toHaveBeenCalledWith('/shop-categories', { signal: undefined })
    const config = apiGet.mock.calls[0][1]
    expect(config?.headers?.['Cache-Control']).toBeUndefined()
  })
})
