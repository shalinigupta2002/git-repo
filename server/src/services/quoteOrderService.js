const crypto = require('crypto')
const { Prisma } = require('@prisma/client')
const { AppError } = require('../utils/AppError.js')
const { applyInventoryChanges } = require('../controllers/orderController.js')

function generateOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

/**
 * Create a PENDING order from an accepted quote using the seller's quoted unit price.
 * Runs inside an existing Prisma transaction.
 */
async function createOrderFromQuote(tx, quote, actorUserId) {
  if (!quote.productId) {
    throw new AppError(
      'This quote is not linked to a seller product. Order cannot be created.',
      400,
      'NO_PRODUCT',
    )
  }
  if (!quote.sellerId) {
    throw new AppError('No seller assigned to this quote.', 400, 'NO_SELLER')
  }
  if (quote.sellerUnitPrice == null) {
    throw new AppError('Seller has not provided a unit price.', 400, 'NO_QUOTE_PRICE')
  }

  const product = await tx.product.findUnique({
    where: { id: quote.productId, isActive: true },
    select: {
      id: true,
      sellerId: true,
      moq: true,
      name: true,
      trackInventory: true,
      stockQty: true,
      reservedQty: true,
    },
  })

  if (!product) {
    throw new AppError('Linked product is no longer available', 404, 'PRODUCT_UNAVAILABLE')
  }

  if (product.sellerId !== quote.sellerId) {
    throw new AppError('Product seller mismatch', 400, 'SELLER_MISMATCH')
  }

  const qty = quote.quantity
  if (qty < product.moq) {
    throw new AppError(`Quantity must be at least MOQ (${product.moq})`, 400, 'BELOW_MOQ')
  }

  const unitPrice = new Prisma.Decimal(quote.sellerUnitPrice.toString())
  const lineTotal = unitPrice.mul(qty)
  const idempotencyKey = `quote-${quote.id}`

  const existingOrder = await tx.order.findFirst({ where: { idempotencyKey } })
  if (existingOrder) return existingOrder

  const created = await tx.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      buyerId: quote.buyerId,
      sellerId: quote.sellerId,
      status: 'PENDING',
      totalAmount: lineTotal,
      notes: `Created from accepted quote (${quote.id})`,
      idempotencyKey,
      items: {
        create: [{
          productId: product.id,
          quantity: qty,
          unitPrice,
          lineTotal,
        }],
      },
      history: {
        create: {
          fromStatus: null,
          toStatus: 'PENDING',
          note: 'Order created from accepted quote — pending payment / seller confirmation',
          changedById: actorUserId,
        },
      },
    },
    include: {
      items: {
        include: { product: { select: { id: true, sku: true, name: true } } },
      },
      buyer: { select: { id: true, email: true, companyName: true } },
      seller: { select: { id: true, email: true, companyName: true } },
    },
  })

  await applyInventoryChanges(
    tx,
    [{ productId: product.id, quantity: qty }],
    'ORDER_RESERVED',
    created.id,
    actorUserId,
    null,
  )

  return created
}

module.exports = { createOrderFromQuote }
