const { z } = require('zod')

const registerBody = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['BUYER', 'SELLER']),
  companyName: z.string().trim().max(255).optional(),
})

const loginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
})

module.exports = { registerBody, loginBody }
