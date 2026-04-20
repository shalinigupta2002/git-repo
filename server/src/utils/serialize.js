function serializeDecimal(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString()
  }
  return value
}

function serializeProduct(p) {
  if (!p) return p
  return {
    ...p,
    price: serializeDecimal(p.price),
    seller: p.seller
      ? {
          id: p.seller.id,
          email: p.seller.email,
          companyName: p.seller.companyName,
        }
      : undefined,
  }
}

function serializeOrder(o) {
  if (!o) return o
  return {
    ...o,
    totalAmount: serializeDecimal(o.totalAmount),
    items: o.items?.map((i) => ({
      ...i,
      unitPrice: serializeDecimal(i.unitPrice),
      lineTotal: serializeDecimal(i.lineTotal),
      product: i.product
        ? {
            id: i.product.id,
            sku: i.product.sku,
            name: i.product.name,
          }
        : undefined,
    })),
  }
}

module.exports = { serializeDecimal, serializeProduct, serializeOrder }
