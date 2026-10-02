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

const CATEGORY_ID = 5

function mockAdminAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

const updatedRow = {
  id: CATEGORY_ID,
  name: 'Updated Name',
  slug: 'updated-name',
  parent_id: null,
  created_at: new Date('2024-03-01T00:00:00.000Z'),
}

describe('PATCH /api/admin/categories/:id (VAL-007-02)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid update with name returns 200', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Updated Name' })

    expect(res.status).toBe(200)
    expect(res.body.data.category.name).toBe('Updated Name')
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE catalog.categories'),
      ['Updated Name', 'updated-name', null, CATEGORY_ID],
    )
  })

  test('valid update with parentId checks parent exists', async () => {
    mockAdminAuth()
    query
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({
        rows: [{ ...updatedRow, parent_id: 2, slug: 'updated-name' }],
        rowCount: 1,
      })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Updated Name', parentId: 2 })

    expect(res.status).toBe(200)
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id FROM catalog.categories WHERE id = $1'),
      [2],
    )
  })

  test('404 when category not found', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Ghost' })

    expect(res.status).toBe(404)
  })

  test.each([
    ['malformed', 'abc'],
    ['zero', '0'],
    ['negative', '-1'],
    ['decimal', '1.5'],
  ])('invalid category id (%s) returns 400 VALIDATION_ERROR', async (_label, id) => {
    mockAdminAuth()
    const spy = jest.spyOn(adminController, 'updateCategory')

    const res = await agent
      .patch(`/api/admin/categories/${id}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Test' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('empty body returns 400 VALIDATION_ERROR', async () => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('whitespace-only name returns 400 VALIDATION_ERROR', async () => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('name length 200 accepted', async () => {
    mockAdminAuth()
    const name = 'U'.repeat(200)
    query.mockResolvedValueOnce({ rows: [{ ...updatedRow, name }], rowCount: 1 })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name })

    expect(res.status).toBe(200)
  })

  test('name length 201 rejected', async () => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'U'.repeat(201) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test.each([
    ['zero', 0],
    ['negative', -1],
    ['decimal', 1.5],
    ['malformed string', 'abc'],
  ])('invalid parentId (%s) returns 400 VALIDATION_ERROR', async (_label, parentId) => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Child', parentId })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(query).not.toHaveBeenCalled()
  })

  test('missing parent category returns 400 PARENT_NOT_FOUND', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rows: [] })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Child', parentId: 999 })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Invalid parent category')
    expect(res.body.error.code).toBe('PARENT_NOT_FOUND')
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE catalog.categories'),
      expect.anything(),
    )
  })

  test('403 for non-admin user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(buyerToken))
      .send({ name: 'Blocked' })

    expect(res.status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })

  test('duplicate slug returns 409 DUPLICATE', async () => {
    mockAdminAuth()
    const dupErr = Object.assign(new Error('duplicate key'), { code: '23505' })
    query.mockRejectedValueOnce(dupErr)

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Duplicate Slug' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE')
    expect(res.body.error.message).toBe('A category with this slug already exists')
  })

  test('other database errors are not mapped to 409', async () => {
    mockAdminAuth()
    const fkErr = Object.assign(new Error('foreign key violation'), { code: '23503' })
    query.mockRejectedValueOnce(fkErr)

    const res = await agent
      .patch(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))
      .send({ name: 'Updated Name' })

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
