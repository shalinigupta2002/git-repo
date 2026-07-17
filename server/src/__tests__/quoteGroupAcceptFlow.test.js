'use strict'

const {
  buildComparisonGroup,
  buildQuotationSummary,
  isBuyerQuotationExpired,
} = require('../services/quoteGroupService.js')

describe('quoteGroupService accept-flow display', () => {
  test('NOT_SELECTED quotations appear expired to buyers', () => {
    const request = {
      id: 'q-1',
      status: 'NOT_SELECTED',
      sellerUnitPrice: 100,
      sellerCurrency: 'INR',
      quoteValidUntil: new Date('2099-01-01'),
    }

    expect(isBuyerQuotationExpired(request)).toBe(true)

    const summary = buildQuotationSummary(request, { buyerView: true })
    expect(summary.expired).toBe(true)
    expect(summary.buyerDisplayStatus).toBe('EXPIRED')
    expect(summary.actionsLocked).toBe(true)
  })

  test('comparison group marks non-winning sellers expired for buyer', () => {
    const rows = [
      {
        id: 'accepted',
        rfqGroupId: 'group-1',
        rfqNumber: 'RFQ-2026-000001',
        productTitle: 'Widget',
        quantity: 5,
        status: 'ACCEPTED',
        sellerUnitPrice: 900,
        sellerCurrency: 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
        seller: { sellerMarketplaceId: 'SEL-1', addresses: [{ city: 'Delhi' }] },
      },
      {
        id: 'not-selected',
        rfqGroupId: 'group-1',
        rfqNumber: 'RFQ-2026-000001',
        productTitle: 'Widget',
        quantity: 5,
        status: 'NOT_SELECTED',
        sellerUnitPrice: 950,
        sellerCurrency: 'INR',
        createdAt: new Date(),
        updatedAt: new Date(),
        seller: { sellerMarketplaceId: 'SEL-2', addresses: [{ city: 'Mumbai' }] },
      },
    ]

    const group = buildComparisonGroup(rows)
    expect(group.aggregateStatus).toBe('ACCEPTED')
    const loser = group.comparison.find((q) => q.quotationId === 'not-selected')
    expect(loser.expired).toBe(true)
    expect(loser.buyerDisplayStatus).toBe('EXPIRED')
    expect(loser.actionsLocked).toBe(true)
  })
})
