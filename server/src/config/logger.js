/**
 * Pino logger — single shared instance for the entire application.
 *
 * Development  → pretty-printed, human-readable, colorized (pino-pretty).
 * Production   → newline-delimited JSON, one object per line; pipe through
 *                `pino-pretty` locally or ship to your log aggregator
 *                (Datadog, Loki, CloudWatch, etc.) as-is.
 *
 * Sensitive fields are redacted at the transport layer so they never appear
 * in log files regardless of which module emits them.
 */

const pino = require('pino')
const env  = require('./env.js')

// Silence all output during automated tests and avoid spawning the
// pino-pretty worker thread, which Jest cannot tear down cleanly.
const isTest = process.env.NODE_ENV === 'test'

const logger = pino(
  {
    level: isTest ? 'silent' : (env.isDev ? 'debug' : 'info'),

    // Static fields appended to every log line
    base: { service: 'b2b-api', env: env.nodeEnv },

    // ISO timestamp on every line
    timestamp: pino.stdTimeFunctions.isoTime,

    // Redact sensitive values so they are never written to any log sink.
    // Paths use a dotted-key syntax; wildcards cover nested objects.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.razorpaySignature',
        'req.body.razorpayKeySecret',
      ],
      censor: '[REDACTED]',
    },
  },
  !isTest && env.isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize:      true,
          ignore:        'pid,hostname,service,env',
          translateTime: 'SYS:HH:MM:ss.l',
          messageFormat: '{msg}',
        },
      })
    : undefined,
)

module.exports = logger
