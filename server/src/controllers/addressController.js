const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { writeAuditLog } = require('../utils/audit.js')

/** Select shape returned for every address response */
const ADDRESS_SELECT = {
  id:         true,
  label:      true,
  line1:      true,
  line2:      true,
  city:       true,
  state:      true,
  postalCode: true,
  country:    true,
  phone:      true,
  isDefault:  true,
  createdAt:  true,
  updatedAt:  true,
}

/** GET /api/addresses */
const list = asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where:   { userId: req.user.id },
    select:  ADDRESS_SELECT,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  res.json({ success: true, data: { addresses } })
})

/** GET /api/addresses/:id */
const getById = asyncHandler(async (req, res) => {
  const address = await prisma.address.findUnique({
    where:  { id: req.params.id },
    select: { ...ADDRESS_SELECT, userId: true },
  })
  if (!address) throw new AppError('Address not found', 404, 'NOT_FOUND')
  if (address.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }
  const { userId: _, ...safe } = address
  res.json({ success: true, data: { address: safe } })
})

/** POST /api/addresses */
const create = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body

  // If this is marked as default, unset previous default first (in a tx)
  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data:  { isDefault: false },
      })
    }
    return tx.address.create({
      data:   { userId: req.user.id, label, line1, line2, city, state, postalCode, country, phone, isDefault: isDefault ?? false },
      select: ADDRESS_SELECT,
    })
  })

  writeAuditLog({ actorId: req.user.id, action: 'CREATE', resource: 'address', resourceId: address.id, req }).catch(() => {})

  res.status(201).json({ success: true, data: { address } })
})

/** PATCH /api/addresses/:id */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await prisma.address.findUnique({ where: { id }, select: { userId: true } })
  if (!existing) throw new AppError('Address not found', 404, 'NOT_FOUND')
  if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const { label, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body
  const data = {}
  if (label      !== undefined) data.label      = label
  if (line1      !== undefined) data.line1      = line1
  if (line2      !== undefined) data.line2      = line2
  if (city       !== undefined) data.city       = city
  if (state      !== undefined) data.state      = state
  if (postalCode !== undefined) data.postalCode = postalCode
  if (country    !== undefined) data.country    = country
  if (phone      !== undefined) data.phone      = phone
  if (isDefault  !== undefined) data.isDefault  = isDefault

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400, 'VALIDATION_ERROR')
  }

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.address.updateMany({
        where: { userId: req.user.id, isDefault: true, id: { not: id } },
        data:  { isDefault: false },
      })
    }
    return tx.address.update({ where: { id }, data, select: ADDRESS_SELECT })
  })

  writeAuditLog({ actorId: req.user.id, action: 'UPDATE', resource: 'address', resourceId: id, meta: data, req }).catch(() => {})

  res.json({ success: true, data: { address } })
})

/** DELETE /api/addresses/:id */
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params

  const existing = await prisma.address.findUnique({ where: { id }, select: { userId: true } })
  if (!existing) throw new AppError('Address not found', 404, 'NOT_FOUND')
  if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  await prisma.address.delete({ where: { id } })

  writeAuditLog({ actorId: req.user.id, action: 'DELETE', resource: 'address', resourceId: id, req }).catch(() => {})

  res.status(204).send()
})

module.exports = { list, getById, create, update, remove }
