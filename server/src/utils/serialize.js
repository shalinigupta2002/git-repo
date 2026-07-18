const { mapMaskedParty } = require('../services/sellerProfileService.js')

const PRE_DEAL_PRIVACY = { dealAccepted: false, dealChargesPaid: false }

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
    seller: p.seller ? mapMaskedParty(p.seller, 'SELLER', PRE_DEAL_PRIVACY) : undefined,
  }
}

function serializeOrderParty(party, role) {
  if (!party) return party
  return mapMaskedParty(party, role, PRE_DEAL_PRIVACY)
}

function serializeOrder(o) {
  if (!o) return o

  const buyer = o.buyer ? serializeOrderParty(o.buyer, 'BUYER') : undefined
  const seller = o.seller ? serializeOrderParty(o.seller, 'SELLER') : undefined

  const {
    buyerId: _buyerId,
    sellerId: _sellerId,
    buyer: _buyer,
    seller: _seller,
    ...rest
  } = o

  return {
    ...rest,
    buyerPortalUserId: buyer?.portalUserId ?? null,
    buyerCity: buyer?.city ?? null,
    sellerPortalUserId: seller?.portalUserId ?? null,
    sellerCity: seller?.city ?? null,
    buyerMarketplaceId: buyer?.portalUserId ?? buyer?.marketplaceId ?? null,
    sellerMarketplaceId: seller?.portalUserId ?? seller?.marketplaceId ?? null,
    totalAmount: serializeDecimal(o.totalAmount),
    buyer,
    seller,
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
