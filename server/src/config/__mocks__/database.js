'use strict'

/**
 * Manual Jest mock for src/config/database.js.
 *
 * Call `jest.mock('../config/database')` (or the appropriate relative path)
 * in a test file to activate this mock.  Each prisma model's methods are
 * plain jest.fn() stubs — set return values in beforeEach / each test via
 * `prisma.user.findUnique.mockResolvedValue(...)`.
 *
 * $transaction calls the supplied callback with the same mock object so
 * that code running inside a transaction sees the same stubs.
 */
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
    delete:     jest.fn(),
    count:      jest.fn(),
  },
  order: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
    count:      jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
  },
  orderHistory: {
    create:   jest.fn(),
    findMany: jest.fn(),
  },
  inventoryLog: {
    create:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
  subscription: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: {
    create:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
  address: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
    delete:     jest.fn(),
  },
  // Simulates Prisma's $transaction by calling the callback with the same
  // mock so that tx.model.method() references resolve to the same stubs.
  $transaction: jest.fn(async (fn) => fn(mockPrisma)),
  $disconnect:  jest.fn(),
}

module.exports = { prisma: mockPrisma }
