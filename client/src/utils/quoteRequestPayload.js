export function quoteRequestPayload(product, message) {
  const body = {
    productTitle: product.title,
    productCategory: product.category?.name,
    brandName: product.brand?.name,
    quantity: 1,
    targetPrice: product.price,
    message,
  }
  if (product.source === 'seller') {
    body.productId = product.id
    if (product.seller?.id) body.sellerId = product.seller.id
  } else {
    body.catalogProductId = product.id
  }
  return body
}
