/**
 * In-memory request metrics.
 *
 * Keeps a rolling window of response times (last 1 000 requests) and running
 * counters for request outcomes.  The data is exposed via GET /api/health.
 *
 * NOT a replacement for Prometheus / Datadog in production — those should be
 * added when the service reaches meaningful traffic.  This layer is enough for
 * early-stage debugging and simple uptime dashboards.
 */

const WINDOW_SIZE = 1_000   // how many response-time samples to keep in RAM

const _state = {
  startedAt:     Date.now(),
  total:         0,
  success:       0,   // 1xx–3xx
  clientError:   0,   // 4xx
  serverError:   0,   // 5xx
  responseTimes: [],  // circular buffer of duration-ms values
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Express middleware that hooks into `res.finish` to record each request.
 * Must be mounted before routes but after the body-parser so that
 * `req.method` and `req.url` are already set.
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now()

  res.on('finish', () => {
    const durationMs = Date.now() - start
    const status     = res.statusCode

    _state.total++
    if (status < 400)      _state.success++
    else if (status < 500) _state.clientError++
    else                   _state.serverError++

    if (_state.responseTimes.length >= WINDOW_SIZE) {
      _state.responseTimes.shift()
    }
    _state.responseTimes.push(durationMs)
  })

  next()
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

/**
 * Returns a plain-object snapshot suitable for the /health response.
 */
function getSnapshot() {
  const mem   = process.memoryUsage()
  const times = _state.responseTimes

  let avgMs = 0
  let p50Ms = 0
  let p95Ms = 0
  let p99Ms = 0

  if (times.length > 0) {
    const sorted = [...times].sort((a, b) => a - b)
    avgMs = Math.round(times.reduce((s, v) => s + v, 0) / times.length)
    p50Ms = sorted[Math.floor(sorted.length * 0.50)] ?? 0
    p95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    p99Ms = sorted[Math.floor(sorted.length * 0.99)] ?? 0
  }

  return {
    uptimeSec: Math.floor((Date.now() - _state.startedAt) / 1_000),
    requests: {
      total:       _state.total,
      success:     _state.success,
      clientError: _state.clientError,
      serverError: _state.serverError,
    },
    responseTime: {
      samples: times.length,
      avgMs,
      p50Ms,
      p95Ms,
      p99Ms,
    },
    memory: {
      heapUsedMb:  +( mem.heapUsed  / 1_048_576).toFixed(1),
      heapTotalMb: +( mem.heapTotal / 1_048_576).toFixed(1),
      rssMb:       +( mem.rss       / 1_048_576).toFixed(1),
      externalMb:  +( mem.external  / 1_048_576).toFixed(1),
    },
  }
}

module.exports = { metricsMiddleware, getSnapshot }
