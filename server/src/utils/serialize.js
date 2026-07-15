const { mapPublicUser } = require('../services/sellerProfileService.js')

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
    seller: p.seller ? mapPublicUser(p.seller) : undefined,
  }
}

function serializeOrderParty(party) {
  if (!party) return party
  return mapPublicUser(party)
}

function serializeOrder(o) {
  if (!o) return o
  return {
    ...o,
    totalAmount: serializeDecimal(o.totalAmount),
    buyer: serializeOrderParty(o.buyer),
    seller: serializeOrderParty(o.seller),
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
    history: o.history ?? undefined,
  }
}

module.exports = { serializeDecimal, serializeProduct, serializeOrder }
