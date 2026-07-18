'use strict'

const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { USER_PUBLIC_SELECT } = require('./sellerProfileService.js')
const { DEAL_INCLUDE } = require('./dealCreationService.js')

const DEAL_API_INCLUDE = {
  ...DEAL_INCLUDE,
  buyer: { select: USER_PUBLIC_SELECT },
  seller: { select: USER_PUBLIC_SELECT },
  quoteRequest: {
    select: {
      id: true,
      rfqNumber: true,
      status: true,
    },
  },
}

const SORTABLE_FIELDS = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  dealNumber: 'dealNumber',
  status: 'status',
  totalAmount: 'totalAmount',
}

function buildSearchFilter(search) {
  if (!search) return undefined
  const term = search.trim()
  if (!term) return undefined

  return {
    OR: [
      { dealNumber: { contains: term, mode: 'insensitive' } },
      { productName: { contains: term, mode: 'insensitive' } },
      { productSku: { contains: term, mode: 'insensitive' } },
      { vendorProductCode: { contains: term, mode: 'insensitive' } },
    ],
  }
}

function buildDateFilter(fromDate, toDate) {
  if (!fromDate && !toDate) return undefined

  const createdAt = {}
  if (fromDate) createdAt.gte = new Date(fromDate)
  if (toDate) createdAt.lte = new Date(toDate)

  return { createdAt }
}

function buildListWhere({
  buyerId,
  sellerId,
  status,
  search,
  fromDate,
  toDate,
}) {
  const where = {}

  if (buyerId) where.buyerId = buyerId
  if (sellerId) where.sellerId = sellerId
  if (status) where.status = status

  const searchFilter = buildSearchFilter(search)
  if (searchFilter) Object.assign(where, searchFilter)

  const dateFilter = buildDateFilter(fromDate, toDate)
  if (dateFilter) Object.assign(where, dateFilter)

  return where
}

function resolveSort(sortBy = 'createdAt', sortOrder = 'desc') {
  const field = SORTABLE_FIELDS[sortBy] ?? 'createdAt'
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'
  return { [field]: direction }
}

async function listDeals(query = {}) {
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const skip = (page - 1) * limit

  const where = buildListWhere(query)
  const orderBy = resolveSort(query.sortBy, query.sortOrder)

  const [rows, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: DEAL_API_INCLUDE,
    }),
    prisma.deal.count({ where }),
  ])

  return {
    deals: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  }
}

async function getDealById(dealId, include = DEAL_API_INCLUDE) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include,
  })

  if (!deal) {
    throw new AppError('Deal not found.', 404, 'DEAL_NOT_FOUND')
  }

  return deal
}

module.exports = {
  DEAL_API_INCLUDE,
  listDeals,
  getDealById,
  buildListWhere,
}
