'use strict'

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  // Run setup.js BEFORE the test framework so env vars are in place
  // when modules (env.js, logger.js, database.js) are first required.
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  // Clear call history between tests; implementations are reset in beforeEach.
  clearMocks: true,
  // Print verbose test names while running
  verbose: true,
  // Silence supertest/pino stderr noise in test output
  silent: false,
}
