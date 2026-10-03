const { prisma }       = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { AppError } = require('../utils/AppError.js')

/** POST /api/category-requests — seller submits a new category or subcategory request */
const createRequest = asyncHandler(async (req, res) => {
  const { categoryName, description, requestType, parentCategoryName, parentCategoryId } = req.body
  const type = requestType === 'SUBCATEGORY' ? 'SUBCATEGORY' : 'CATEGORY'
  if (type === 'SUBCATEGORY' && !parentCategoryName?.trim() && !parentCategoryId) {
    throw new AppError(
      'parentCategoryName or parentCategoryId is required for subcategory requests',
      400,
      'VALIDATION_ERROR',
    )
  }

  let resolvedParentId = null
  if (type === 'SUBCATEGORY' && parentCategoryId != null && parentCategoryId !== '') {
    const numId = Number(parentCategoryId)
    if (!Number.isFinite(numId)) {
      throw new AppError('parentCategoryId must be a number', 400, 'VALIDATION_ERROR')
    }
    resolvedParentId = numId
  }

  const existing = await prisma.categoryRequest.findFirst({
    where: {
      sellerId:     req.user.id,
      categoryName: { equals: categoryName, mode: 'insensitive' },
      requestType:  type,
      status:       'PENDING',
    },
  })
  if (existing) {
    throw new AppError('You already have a pending request for this category', 409, 'CONFLICT')
  }

  const request = await prisma.categoryRequest.create({
    data: {
      sellerId:           req.user.id,
      requestType:        type,
      categoryName,
      parentCategoryName: type === 'SUBCATEGORY' ? (parentCategoryName?.trim() || null) : null,
      parentCategoryId:   type === 'SUBCATEGORY' ? resolvedParentId : null,
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
    throw new AppError('Request not found', 404, 'NOT_FOUND')
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
