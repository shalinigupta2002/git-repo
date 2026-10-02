'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/db/pool.js', () => ({
  query: jest.fn(),
}))

const adminController = require('../../src/controllers/adminController.js')
const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const { query } = require('../../src/db/pool.js')

const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

function mockAdminAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

const createdRow = {
  id: 10,
  name: 'New Root',
  slug: 'new-root',
  parent_id: null,
  created_at: new Date('2024-03-01T00:00:00.000Z'),
}

describe('POST /api/admin/categories (VAL-007-01)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid root category creation returns 201', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rows: [createdRow] })

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'New Root' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.category.name).toBe('New Root')
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      ['New Root', 'new-root', null],
    )
  })

  test('valid child category creation with parentId', async () => {
    mockAdminAuth()
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Electronics', slug: 'electronics' }] })
      .mockResolvedValueOnce({ rows: [{ slug: 'electronics' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 11,
          name: 'Cables',
          slug: 'electronics-cables',
          parent_id: 1,
          created_at: createdRow.created_at,
        }],
      })

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'Cables', parentId: 1 })

    expect(res.status).toBe(201)
    expect(res.body.data.category.parentId).toBe(1)
    expect(query).toHaveBeenCalledTimes(3)
  })

  test('missing name returns 400 VALIDATION_ERROR', async () => {
    mockAdminAuth()

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('whitespace-only name returns 400 VALIDATION_ERROR', async () => {
    mockAdminAuth()

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('name length 200 is accepted', async () => {
    mockAdminAuth()
    const name = 'N'.repeat(200)
    query.mockResolvedValueOnce({
      rows: [{ ...createdRow, name, slug: 'n'.repeat(200).replace(/[^a-z0-9]+/g, '-').slice(0, 50) }],
    })

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name })

    expect(res.status).toBe(201)
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([name, expect.any(String), null]),
    )
  })

  test('name length 201 is rejected', async () => {
    mockAdminAuth()
    const spy = jest.spyOn(adminController, 'createCategory')

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'X'.repeat(201) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test.each([
    ['zero', { parentId: 0 }],
    ['negative', { parentId: -1 }],
    ['decimal', { parentId: 1.5 }],
    ['malformed string', { parentId: 'abc' }],
  ])('invalid parentId (%s) returns 400 VALIDATION_ERROR', async (_label, body) => {
    mockAdminAuth()

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'Child Cat', ...body })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('nonexistent parentId returns 400 PARENT_NOT_FOUND without insert', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rows: [] })

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'Child Cat', parentId: 999 })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Invalid parent category')
    expect(res.body.error.code).toBe('PARENT_NOT_FOUND')
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      expect.anything(),
    )
  })

  test('duplicate slug returns 409 DUPLICATE', async () => {
    mockAdminAuth()
    const dupErr = Object.assign(new Error('duplicate key'), { code: '23505' })
    query.mockRejectedValueOnce(dupErr)

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(adminToken))
      .send({ name: 'Duplicate Slug' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE')
  })

  test('403 for non-admin user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .post('/api/admin/categories')
      .set(cookieFor(buyerToken))
      .send({ name: 'Blocked' })

    expect(res.status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })
})
