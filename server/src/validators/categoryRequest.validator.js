const { z } = require('zod')

/** POST /api/category-requests — aligns with CategoryRequest VarChar limits in Prisma. */
const createCategoryRequestBody = z.object({
  categoryName: z.string().trim().min(1, 'categoryName is required').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  requestType: z.enum(['CATEGORY', 'SUBCATEGORY']).optional(),
  parentCategoryName: z.string().trim().max(200).optional().nullable(),
  parentCategoryId: z.union([z.number(), z.string()]).optional().nullable(),
})

/** PATCH /api/admin/category-requests/:id/decide */
const decideCategoryRequestBody = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().trim().max(500).optional().nullable(),
  name: z.string().trim().max(200).optional().nullable(),
  parentId: z.union([z.number(), z.string()]).optional().nullable(),
})

module.exports = { createCategoryRequestBody, decideCategoryRequestBody }
