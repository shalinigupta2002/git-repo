const UOM_CODES = ['MT', 'PCS', 'M', 'KG', 'L', 'BOX', 'SET', 'CARTON', 'BAG']

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

function normalizeUomCode(raw) {
  if (raw == null || raw === '') return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null

  const parenMatch = trimmed.match(/\(([A-Z0-9]+)\)\s*$/i)
  if (parenMatch) return parenMatch[1].toUpperCase()

  const upper = trimmed.toUpperCase()
  if (UOM_CODES.includes(upper)) return upper

  for (const [code, label] of Object.entries(UOM_LABELS)) {
    if (label.toLowerCase() === trimmed.toLowerCase()) return code
  }

  return upper.length <= 16 ? upper : null
}

function parseUomFromDescription(description) {
  if (!description) return null
  const match = description.match(/UOM:\s*([^.]+)\./i)
  return match?.[1]?.trim() ? normalizeUomCode(match[1].trim()) : null
}

function resolveProductUom(product) {
  if (!product) return null
  if (product.uom) return normalizeUomCode(product.uom)
  return parseUomFromDescription(product.description)
}

module.exports = {
  UOM_CODES,
  UOM_LABELS,
  normalizeUomCode,
  parseUomFromDescription,
  resolveProductUom,
}
