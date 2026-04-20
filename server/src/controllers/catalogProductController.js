const { asyncHandler } = require('../utils/asyncHandler.js')
const catalogProductService = require('../services/catalogProductService.js')

const listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, cursor, limit } = req.query

  const { products, nextCursor } = await catalogProductService.listProducts({
    q,
    category,
    brand,
    cursor,
    limit,
  })

  res.json({
    success: true,
    data: products,
    nextCursor,
  })
})

module.exports = { listProducts }
