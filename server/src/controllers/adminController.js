const { prisma } = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { serializeOrder } = require('../utils/serialize.js')

function serializeUserSafe(u) {
  if (!u) return u
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    companyName: u.companyName,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

const listBuyers = asyncHandler(async (req, res) => {
  const rows = await prisma.user.findMany({
    where: { role: 'BUYER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      companyName: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { buyerOrders: true } },
    },
  })

  res.json({
    success: true,
    data: rows.map((u) => ({
      ...serializeUserSafe(u),
      ordersPlaced: u._count.buyerOrders,
    })),
  })
})

const listSellers = asyncHandler(async (req, res) => {
  const rows = await prisma.user.findMany({
    where: { role: 'SELLER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      companyName: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          products: true,
          sellerOrders: true,
        },
      },
    },
  })

  res.json({
    success: true,
    data: rows.map((u) => ({
      ...serializeUserSafe(u),
      productsCount: u._count.products,
      ordersCount: u._count.sellerOrders,
    })),
  })
})

const listTransactions = asyncHandler(async (req, res) => {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { id: true, email: true, companyName: true } },
      seller: { select: { id: true, email: true, companyName: true } },
      items: {
        include: {
          product: { select: { id: true, sku: true, name: true } },
        },
      },
    },
  })

  res.json({
    success: true,
    data: rows.map(serializeOrder),
  })
})

const stats = asyncHandler(async (req, res) => {
  const [buyers, sellers, products, orders, revenueAgg] = await Promise.all([
    prisma.user.count({ where: { role: 'BUYER' } }),
    prisma.user.count({ where: { role: 'SELLER' } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
    }),
  ])

  res.json({
    success: true,
    data: {
      buyers,
      sellers,
      products,
      orders,
      revenue: revenueAgg._sum.totalAmount?.toString() ?? '0',
    },
  })
})

module.exports = { listBuyers, listSellers, listTransactions, stats }
