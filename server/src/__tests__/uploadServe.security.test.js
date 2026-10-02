'use strict'

jest.mock('../config/database')

const fs = require('fs')
const path = require('path')
const { agent, cookieFor, makeToken, makeUser, makeSeller, IDS } = require('./helpers')
const { prisma } = require('../config/database')
const { UPLOAD_DIR: PRODUCT_UPLOAD_DIR } = require('../middleware/productUpload.js')
const { UPLOAD_DIR: CONTACT_UPLOAD_DIR } = require('../middleware/contactUpload.js')

const BUYER = makeUser()
const OTHER = makeUser({ id: IDS.OTHER_BUYER, email: 'other@test.com' })
const ADMIN = makeUser({ id: IDS.ADMIN, email: 'admin@test.com', role: 'ADMIN' })

const buyerToken = makeToken({ id: BUYER.id, email: BUYER.email, role: 'BUYER' })
const otherToken = makeToken({ id: OTHER.id, email: OTHER.email, role: 'BUYER' })
const adminToken = makeToken({ id: ADMIN.id, email: ADMIN.email, role: 'ADMIN' })

const CONTACT_FILE = '1700000000000-deadbeef.png'
const PRODUCT_FILE = '1700000000001-cafebabe.jpg'

function mockAuth(users) {
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    const u = users.find((row) => row.id === where.id)
    return u ? { ...u, isActive: true } : null
  })
}

describe('SEC-02 — contact attachment download', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fs.mkdirSync(CONTACT_UPLOAD_DIR, { recursive: true })
  })

  test('unauthenticated download receives 401', async () => {
    const res = await agent.get(`/api/uploads/contact/${CONTACT_FILE}`)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  test('authorized sender can download attachment referenced on their message', async () => {
    mockAuth([BUYER])
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'msg-1' }])
      .mockResolvedValueOnce([])

    const filePath = path.join(CONTACT_UPLOAD_DIR, CONTACT_FILE)
    fs.writeFileSync(filePath, Buffer.from('contact-bytes'))

    const res = await agent
      .get(`/api/uploads/contact/${CONTACT_FILE}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    fs.unlinkSync(filePath)
  })

  test('another user receives 403 FORBIDDEN', async () => {
    mockAuth([OTHER])
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const res = await agent
      .get(`/api/uploads/contact/${CONTACT_FILE}`)
      .set(cookieFor(otherToken))

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('admin can download contact attachment without sender match', async () => {
    mockAuth([ADMIN])
    prisma.$queryRaw.mockResolvedValue([])

    const filePath = path.join(CONTACT_UPLOAD_DIR, CONTACT_FILE)
    fs.writeFileSync(filePath, Buffer.from('admin-ok'))

    const res = await agent
      .get(`/api/uploads/contact/${CONTACT_FILE}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    fs.unlinkSync(filePath)
  })

  test('invalid filename returns 400', async () => {
    mockAuth([BUYER])
    const res = await agent
      .get('/api/uploads/contact/not%20valid.png')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('unknown filename returns 404 after authorization', async () => {
    mockAuth([BUYER])
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'msg-1' }]).mockResolvedValueOnce([])

    const res = await agent
      .get('/api/uploads/contact/1700000000999-unknown.png')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
  })
})

describe('SEC-02 — product image download (public catalog)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true })
  })

  test('public product image can be fetched without authentication from disk', async () => {
    const filePath = path.join(PRODUCT_UPLOAD_DIR, PRODUCT_FILE)
    fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff]))

    const res = await agent.get(`/api/uploads/products/${PRODUCT_FILE}`)

    expect(res.status).toBe(200)
    fs.unlinkSync(filePath)
  })

  test('path traversal attempt returns 404', async () => {
    const res = await agent.get('/api/uploads/products/..%2F..%2Fetc%2Fpasswd')
    expect(res.status).toBe(404)
  })

  test('DB-backed image requires product reference (orphan blob not served)', async () => {
    prisma.$queryRaw.mockResolvedValue([])
    prisma.uploadedFile.findUnique.mockResolvedValue({
      key: 'orphan-only.jpg',
      mimeType: 'image/jpeg',
      data: Buffer.from([0xff, 0xd8]),
    })

    const res = await agent.get('/api/uploads/products/orphan-only.jpg')

    expect(res.status).toBe(404)
    expect(prisma.uploadedFile.findUnique).not.toHaveBeenCalled()
  })

  test('DB-backed image is served when referenced on a product', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: IDS.PRODUCT }])
    prisma.uploadedFile.findUnique.mockResolvedValue({
      key: 'linked-only.jpg',
      mimeType: 'image/jpeg',
      data: Buffer.from([0xff, 0xd8, 0xff]),
    })

    const res = await agent.get('/api/uploads/products/linked-only.jpg')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/image/)
  })
})
