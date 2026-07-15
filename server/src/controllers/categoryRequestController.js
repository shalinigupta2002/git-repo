const { prisma }       = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')

/** POST /api/category-requests — seller submits a new category or subcategory request */
const createRequest = asyncHandler(async (req, res) => {
  const { categoryName, description, requestType, parentCategoryName } = req.body
  if (!categoryName || !categoryName.trim()) {
    return res.status(400).json({ success: false, error: { message: 'categoryName is required' } })
  }
  const type = requestType === 'SUBCATEGORY' ? 'SUBCATEGORY' : 'CATEGORY'
  if (type === 'SUBCATEGORY' && !parentCategoryName?.trim()) {
    return res.status(400).json({ success: false, error: { message: 'parentCategoryName is required for subcategory requests' } })
  }

  const existing = await prisma.categoryRequest.findFirst({
    where: {
      sellerId:     req.user.id,
      categoryName: { equals: categoryName.trim(), mode: 'insensitive' },
      requestType:  type,
      status:       'PENDING',
    },
  })
  if (existing) {
    return res.status(409).json({ success: false, error: { message: 'You already have a pending request for this category' } })
  }

  const request = await prisma.categoryRequest.create({
    data: {
      sellerId:           req.user.id,
      requestType:        type,
      categoryName:       categoryName.trim(),
      parentCategoryName: type === 'SUBCATEGORY' ? parentCategoryName.trim() : null,
      description:        description?.trim() || null,
    },
  })

  res.status(201).json({ success: true, data: { request } })
})

/** GET /api/category-requests — seller lists their own requests */
const listMyRequests = asyncHandler(async (req, res) => {
  const requests = await prisma.categoryRequest.findMany({
    where:   { sellerId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ success: true, data: { requests } })
})

/** GET /api/category-requests/unread-count — count of unread decisions */
const unreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.categoryRequest.count({
    where: {
      sellerId:         req.user.id,
      status:           { in: ['APPROVED', 'REJECTED'] },
      notificationRead: false,
    },
  })
  res.json({ success: true, data: { count } })
})

/** PATCH /api/category-requests/:id/read — mark notification as read */
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await prisma.categoryRequest.findFirst({
    where: { id, sellerId: req.user.id },
  })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Request not found' } })
  }

  await prisma.categoryRequest.update({
    where: { id },
    data:  { notificationRead: true },
  })

  res.json({ success: true, data: { message: 'Marked as read' } })
})

/** PATCH /api/category-requests/mark-all-read — mark all notifications read */
const markAllRead = asyncHandler(async (req, res) => {
  await prisma.categoryRequest.updateMany({
    where: {
      sellerId:         req.user.id,
      status:           { in: ['APPROVED', 'REJECTED'] },
      notificationRead: false,
    },
    data: { notificationRead: true },
  })

  res.json({ success: true, data: { message: 'All notifications marked as read' } })
})

/** GET /api/category-requests/approved — marketplace-wide approved categories */
const listApproved = asyncHandler(async (_req, res) => {
  const requests = await prisma.categoryRequest.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      requestType: true,
      categoryName: true,
      parentCategoryName: true,
    },
  })

  res.json({ success: true, data: { requests } })
})

module.exports = { createRequest, listMyRequests, unreadCount, markRead, markAllRead, listApproved }
