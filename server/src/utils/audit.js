const { prisma } = require('../config/database.js')
const logger     = require('../config/logger.js')

/**
 * Append a row to the audit_logs table.
 *
 * This is intentionally fire-and-forget: call it without `await` so a logging
 * failure never blocks or crashes the parent request.  Errors are recorded via
 * the structured logger (not console.warn) so they appear in log aggregators.
 *
 * @param {object}  opts
 * @param {string|null}  opts.actorId      User ID who triggered the action (null = system)
 * @param {string}       opts.action       AuditAction enum value
 * @param {string}       opts.resource     Logical resource name ("order", "product", …)
 * @param {string|null}  [opts.resourceId] ID of the affected resource
 * @param {object|null}  [opts.meta]       Extra context (field diffs, old values, …)
 * @param {import('express').Request} [opts.req] Express request for IP + user-agent
 */
async function writeAuditLog({ actorId, action, resource, resourceId, meta, req }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    actorId ?? null,
        action,
        resource,
        resourceId: resourceId ?? null,
        meta:       meta ?? null,
        ipAddress:  req?.ip?.slice(0, 45) ?? null,
        userAgent:  req?.headers?.['user-agent']?.slice(0, 512) ?? null,
      },
    })
  } catch (err) {
    logger.warn({ action, resource, resourceId, err }, 'Failed to write audit log')
  }
}

module.exports = { writeAuditLog }
