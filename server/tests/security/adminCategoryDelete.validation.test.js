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

const CATEGORY_ID = 7

function mockAdminAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

describe('DELETE /api/admin/categories/:id (VAL-007-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid category deletion returns 200', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rowCount: 1 })

    const res = await agent
      .delete(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.message).toBe('Category deleted')
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM catalog.categories'),
      [CATEGORY_ID],
    )
  })

  test('missing category returns 404', async () => {
    mockAdminAuth()
    query.mockResolvedValueOnce({ rowCount: 0 })

    const res = await agent
      .delete(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('Category not found')
  })

  test.each([
    ['malformed', 'abc'],
    ['zero', '0'],
    ['negative', '-1'],
    ['decimal', '1.5'],
  ])('invalid category id (%s) returns 400 VALIDATION_ERROR', async (_label, id) => {
    mockAdminAuth()
    const spy = jest.spyOn(adminController, 'deleteCategory')

    const res = await agent
      .delete(`/api/admin/categories/${id}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('403 for non-admin user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .delete(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })

  test('database errors are not converted to 400', async () => {
    mockAdminAuth()
    const fkErr = Object.assign(new Error('foreign key violation'), { code: '23503' })
    query.mockRejectedValueOnce(fkErr)

    const res = await agent
      .delete(`/api/admin/categories/${CATEGORY_ID}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
