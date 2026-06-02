'use strict'

/**
 * Jest setupFiles — runs in the Node VM context BEFORE any test module
 * is imported. Setting process.env here ensures every module (env.js,
 * logger.js, database.js …) sees the test values when first required.
 */
process.env.NODE_ENV        = 'test'
process.env.DATABASE_URL    = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET      = 'test-jwt-secret-at-least-32-characters-long!'
process.env.JWT_EXPIRES_IN  = '1h'
process.env.COOKIE_MAX_AGE  = '3600000'
process.env.CLIENT_URL      = 'http://localhost:5173'
process.env.RAZORPAY_KEY_ID     = 'rzp_test_TESTID'
process.env.RAZORPAY_KEY_SECRET = 'test_secret_TESTKEY'
process.env.PORT            = '3001'
