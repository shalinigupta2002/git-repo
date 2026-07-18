const { asyncHandler } = require('../utils/asyncHandler.js')
const { fetchActiveCategoryTree } = require('../services/shopCategoryDbService.js')

/** GET /api/shop-categories — active category tree for seller product forms */
const listShopCategories = asyncHandler(async (_req, res) => {
  const tree = await fetchActiveCategoryTree()
  res.set('Cache-Control', 'no-store')
  res.json({ success: true, data: { tree } })
})

module.exports = { listShopCategories }
