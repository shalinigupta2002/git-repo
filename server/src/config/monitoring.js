'use strict'

const env = require('./env.js')

let captureException = () => {}

function initMonitoring() {
  if (!env.sentryDsn) {
    return { captureException }
  }

  try {
    // Optional — only loaded when SENTRY_DSN is configured.
    // eslint-disable-next-line global-require
    const Sentry = require('@sentry/node')
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.nodeEnv,
      tracesSampleRate: env.isProd ? 0.1 : 0,
    })
    captureException = (err, context) => {
      Sentry.captureException(err, context ? { extra: context } : undefined)
    }
  } catch {
    captureException = () => {}
  }

  return { captureException }
}

module.exports = { initMonitoring, getCaptureException: () => captureException }
