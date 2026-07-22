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

const UOM_LABELS = {
  MT: 'Metric ton (MT)',
  PCS: 'Pieces (PCS)',
  M: 'Meters (M)',
  KG: 'Kilograms (KG)',
  L: 'Litres (L)',
  BOX: 'Box (BOX)',
  SET: 'Set (SET)',
  CARTON: 'Carton (CARTON)',
  BAG: 'Bag (BAG)',
}

/** Normalize seller UOM codes/labels to a canonical uppercase code. */
export function normalizeUomCode(uom) {
  if (uom == null || uom === '') return null
  const trimmed = String(uom).trim()
  if (!trimmed) return null

  const parenMatch = trimmed.match(/\(([A-Z0-9]+)\)\s*$/i)
  if (parenMatch) return parenMatch[1].toUpperCase()

  const upper = trimmed.toUpperCase()
  if (UOM_LABELS[upper]) return upper

  for (const [code, label] of Object.entries(UOM_LABELS)) {
    if (label.toLowerCase() === trimmed.toLowerCase()) return code
  }

  return upper
}

/** Map Unit of Measure codes to full user-facing labels. */
export function formatUom(uom) {
  const code = normalizeUomCode(uom)
  if (!code) return '—'
  if (UOM_LABELS[code]) return UOM_LABELS[code]
  return String(uom).trim()
}
