'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/utils/audit')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const { validateRfqUploadFile } = require('../../src/utils/rfqFileValidation.js')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

describe('RFQ production hardening', () => {
  beforeEach(() => {
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
    prisma.rfqNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 1 })
    prisma.rfqGroup.create.mockResolvedValue({
      id: '88888888-8888-4888-8888-888888888888',
      rfqNumber: 'RFQ-2026-000001',
    })
  })

  test('400 – multi-product RFQ rejected', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001', status: 'ACTIVE' })

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({
        productTitle: 'Widget',
        productIds: [IDS.PRODUCT, IDS.PRODUCT2],
        sellerIds: [IDS.SELLER],
        deliveryLocation: 'Mumbai',
        expectedDeliveryDate: '2026-08-01',
        message: 'Need specs',
      })

    expect(res.status).toBe(400)
    const body = JSON.stringify(res.body)
    expect(body).toMatch(/Multi-product RFQ is not supported/i)
  })

  test('403 – buyer cannot access another buyer RFQ group comparison', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.rfqGroup.findFirst.mockResolvedValue(null)

    const res = await agent
      .get('/api/quote-requests/groups/88888888-8888-4888-8888-888888888888')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
  })

  test('403 – attachment download denied without ownership', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.$queryRaw.mockResolvedValue([])

    const res = await agent
      .get('/api/quote-requests/attachments/file/test-file.pdf')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
  })

  test('upload validation rejects executable extension', () => {
    expect(() => validateRfqUploadFile({
      originalname: 'malware.exe',
      mimetype: 'application/octet-stream',
      size: 100,
    })).toThrow(/not allowed/i)
  })
})
