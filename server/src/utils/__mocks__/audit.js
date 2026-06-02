'use strict'

/** Fire-and-forget audit logging — silenced in tests. */
const writeAuditLog = jest.fn().mockResolvedValue(undefined)

module.exports = { writeAuditLog }
