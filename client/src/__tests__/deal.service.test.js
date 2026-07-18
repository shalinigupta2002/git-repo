import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getBuyerDeal,
  listBuyerDeals,
  payBuyerDeal,
  updateDealChargeConfig,
} from '../services/deal.service.js'

vi.mock('../services/api.js', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { api } from '../services/api.js'

describe('deal.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists buyer deals', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          deals: [{ id: 'deal-1', dealNumber: 'DEAL-2026-000001' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    })

    const result = await listBuyerDeals({ page: 1 })
    expect(api.get).toHaveBeenCalledWith('/v1/deals', { params: { page: 1 } })
    expect(result.deals).toHaveLength(1)
  })

  it('loads a buyer deal by id', async () => {
    api.get.mockResolvedValue({
      data: { success: true, data: { deal: { id: 'deal-1' } } },
    })

    const result = await getBuyerDeal('deal-1')
    expect(api.get).toHaveBeenCalledWith('/v1/deals/deal-1')
    expect(result.deal.id).toBe('deal-1')
  })

  it('posts buyer payment', async () => {
    api.post.mockResolvedValue({
      data: { success: true, data: { deal: { id: 'deal-1', status: 'ACTIVE' } } },
    })

    const result = await payBuyerDeal('deal-1')
    expect(api.post).toHaveBeenCalledWith('/v1/deals/deal-1/pay')
    expect(result.deal.status).toBe('ACTIVE')
  })

  it('updates admin charge config', async () => {
    api.put.mockResolvedValue({
      data: { success: true, data: { config: { id: 'cfg-1', value: '3' } } },
    })

    const result = await updateDealChargeConfig('cfg-1', { value: 3 })
    expect(api.put).toHaveBeenCalledWith('/v1/admin/deal-charge-configs/cfg-1', { value: 3 })
    expect(result.config.value).toBe('3')
  })
})
