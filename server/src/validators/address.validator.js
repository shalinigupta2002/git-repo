const { z } = require('zod')

/** Reusable inline address shape — used both for saved addresses and order snapshots. */
const addressBody = z.object({
  label:      z.string().trim().max(100).optional().nullable(),
  line1:      z.string().trim().min(1).max(255),
  line2:      z.string().trim().max(255).optional().nullable(),
  city:       z.string().trim().min(1).max(100),
  state:      z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country:    z.string().trim().length(2).optional().default('IN'),
  phone:      z.string().trim().max(20).optional().nullable(),
  isDefault:  z.boolean().optional().default(false),
})

const updateAddressBody = addressBody.partial()

const addressIdParam = z.object({
  id: z.string().uuid(),
})

/**
 * Inline address snapshot for use inside order creation — no isDefault field
 * since it is stored as a plain JSON blob, not a saved address record.
 */
const addressSnapshot = z.object({
  label:      z.string().trim().max(100).optional().nullable(),
  line1:      z.string().trim().min(1).max(255),
  line2:      z.string().trim().max(255).optional().nullable(),
  city:       z.string().trim().min(1).max(100),
  state:      z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country:    z.string().trim().length(2).optional().default('IN'),
  phone:      z.string().trim().max(20).optional().nullable(),
})

module.exports = { addressBody, updateAddressBody, addressIdParam, addressSnapshot }
