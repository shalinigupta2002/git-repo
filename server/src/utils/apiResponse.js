'use strict'

/**
 * Standard success envelope for REST APIs.
 * Errors are handled centrally by errorHandler ({ success: false, error: {...} }).
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  })
}

module.exports = { sendSuccess }
