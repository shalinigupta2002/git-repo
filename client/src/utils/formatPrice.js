/** Format a product price using the seller's currency (defaults to INR). */
export function formatProductPrice(price, currency = 'INR') {
  const num = Number(price)
  if (!Number.isFinite(num)) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}
