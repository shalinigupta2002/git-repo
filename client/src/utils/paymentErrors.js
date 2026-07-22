export const PAYMENT_CANCELLED_CODE = 'PAYMENT_CANCELLED'

export function createPaymentCancelledError() {
  const error = new Error('Payment cancelled')
  error.code = PAYMENT_CANCELLED_CODE
  return error
}

export function isPaymentCancelledError(error) {
  if (!error) return false
  if (error.code === PAYMENT_CANCELLED_CODE) return true
  const message = String(error.message || '').trim().toLowerCase()
  return message === 'payment cancelled' || message === 'payment canceled'
}
