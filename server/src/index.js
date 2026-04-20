const app = require('./app.js')
const env = require('./config/env.js')

const server = app.listen(env.port, () => {
  console.log(`API listening on port ${env.port} (${env.nodeEnv})`)
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `\n[startup] Port ${env.port} is already in use.\n` +
        `           Another process is holding it. Run:\n` +
        `             npm run free:port\n` +
        `           then try again. Exiting.\n`,
    )
    process.exit(1)
  }
  console.error('[startup] server error:', err)
  process.exit(1)
})

function shutdown(signal) {
  console.log(`${signal} received, closing server…`)
  server.close(() => {
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
