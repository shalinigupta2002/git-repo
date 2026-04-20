const { AppError } = require('../utils/AppError.js')

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source]
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      const details = parsed.error.flatten()
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details))
    }
    req[source] = parsed.data
    next()
  }
}

module.exports = { validate }
