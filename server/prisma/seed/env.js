/** Shared environment guards for seed / cleanup / reset scripts. */

function isTruthyEnv(name) {
  const value = process.env[name]
  if (value == null) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function shouldResetDatabase() {
  return isTruthyEnv('RESET_DATABASE')
}

function assertCleanupAllowed(context = 'database cleanup') {
  if (process.env.NODE_ENV === 'production' && !isTruthyEnv('ALLOW_PRODUCTION_RESET')) {
    throw new Error(
      `Production ${context} is blocked. Set ALLOW_PRODUCTION_RESET=true to override (dangerous).`,
    )
  }
}

module.exports = {
  isTruthyEnv,
  shouldResetDatabase,
  assertCleanupAllowed,
}
