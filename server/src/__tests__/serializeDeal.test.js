'use strict'

const { serializeDeal } = require('../utils/serializeDeal.js')

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    portalUserId: 'USR-DEMO-000001',
    companyName: 'Acme Corp',
    email: 'contact@acme.test',
    addresses: [{
      city: 'Mumbai',
      state: 'Maharashtra',
      line1: '12 Market Road',
      line2: 'Floor 2',
      postalCode: '400001',
      phone: '9999999999',
    }],
    ...overrides,
  }
}

function makeDeal(overrides = {}) {
  return {
    id: 'deal-1',
    dealNumber: 'DEAL-2026-000001',
    quoteRequestId: 'quote-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    productName: 'Widget',
    quantity: 1,
    unitPrice: '100',
    totalAmount: '100',
    currency: 'INR',
    status: 'PAYMENT_PENDING',
    buyerDealCharge: '10',
    sellerDealCharge: '10',
    contactUnlockStatus: 'LOCKED',
    contactUnlockOverride: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    payments: [],
    events: [],
    buyer: makeUser({ id: 'buyer-1', portalUserId: 'USR-BUYER-001' }),
    seller: makeUser({ id: 'seller-1', portalUserId: 'USR-SELLER-001', companyName: 'Seller Co', email: 'seller@test.com' }),
    ...overrides,
  }
}

describe('serializeDeal contact privacy', () => {
  test('masks counterparty fields while contact is LOCKED', () => {
    const serialized = serializeDeal(makeDeal({ contactUnlockStatus: 'LOCKED' }))

    expect(serialized.seller.portalUserId).toBe('USR-SELLER-001')
    expect(serialized.seller.city).toBe('Mumbai')
    expect(serialized.seller.profileUnlocked).toBe(false)
    expect(serialized.seller.companyName).toBeUndefined()
    expect(serialized.seller.email).toBeUndefined()
    expect(serialized.seller.phone).toBeUndefined()
    expect(serialized.seller.addressLine1).toBeUndefined()
  })

  test('returns full counterparty profile when contact is UNLOCKED', () => {
    const serialized = serializeDeal(makeDeal({
      contactUnlockStatus: 'UNLOCKED',
      status: 'ACTIVE',
    }))

    expect(serialized.seller.profileUnlocked).toBe(true)
    expect(serialized.seller.companyName).toBe('Seller Co')
    expect(serialized.seller.email).toBe('seller@test.com')
    expect(serialized.seller.phone).toBe('9999999999')
    expect(serialized.seller.addressLine1).toBe('12 Market Road')
    expect(serialized.seller.state).toBe('Maharashtra')
    expect(serialized.seller.postalCode).toBe('400001')
  })

  test('unlocks profile when contactUnlockOverride is true', () => {
    const serialized = serializeDeal(makeDeal({
      contactUnlockStatus: 'LOCKED',
      contactUnlockOverride: true,
    }))

    expect(serialized.buyer.profileUnlocked).toBe(true)
    expect(serialized.buyer.companyName).toBe('Acme Corp')
    expect(serialized.buyer.email).toBe('contact@acme.test')
  })
})
