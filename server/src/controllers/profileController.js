const { asyncHandler } = require('../utils/asyncHandler.js')
const { fetchProfileView } = require('../services/userProfileViewService.js')

/** GET /api/profile — read-only profile view (Main Portal integration point) */
const getProfile = asyncHandler(async (req, res) => {
  const profile = await fetchProfileView(req.user.id)
  res.json({ success: true, data: { profile } })
})

module.exports = { getProfile }
