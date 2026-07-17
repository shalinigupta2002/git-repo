const {
  CATALOG,
  PREMIUM_AUTOMATION_SELLER,
  PREMIUM_SUBSCRIPTION_SPECS,
  PLAN_AMOUNTS_PAISE,
  shouldSeedQaUsers,
} = require('./constants.js')
const { money, buildProductImages, buildDescription } = require('./helpers.js')

const MARKETPLACE_ACTIVATED_AT = new Date('2026-01-01T00:00:00.000Z')

async function syncMarketplaceIdentity(prisma, userId, spec, plan) {
  const data =
    spec.role === 'BUYER'
      ? {
          buyerMarketplaceId: spec.memberId,
          buyerSubscriptionStatus: 'ACTIVE',
          buyerSubscriptionPlan: plan,
          buyerSubscriptionActivatedAt: MARKETPLACE_ACTIVATED_AT,
        }
      : {
          sellerMarketplaceId: spec.memberId,
          sellerSubscriptionStatus: 'ACTIVE',
          sellerSubscriptionPlan: plan,
          sellerSubscriptionActivatedAt: MARKETPLACE_ACTIVATED_AT,
        }

  await prisma.user.update({ where: { id: userId }, data })
}

async function upsertPremiumSubscription(prisma, userId, spec, userSpec) {
  let subscription = await prisma.subscription.findFirst({
    where: { userId, plan: spec.plan, status: 'ACTIVE' },
  })

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: spec.plan,
        status: 'ACTIVE',
        expiresAt: null,
      },
    })
  } else {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE', expiresAt: null },
    })
  }

  const amountPaise = PLAN_AMOUNTS_PAISE[spec.plan] || 999900
  await prisma.payment.upsert({
    where: { razorpayOrderId: spec.paymentKey },
    update: {
      userId,
      subscriptionId: subscription.id,
      plan: spec.plan,
      amountPaise,
      status: 'PAID',
      razorpayPaymentId: `${spec.paymentKey}_pay`,
      razorpaySignature: `${spec.paymentKey}_sig`,
    },
    create: {
      userId,
      subscriptionId: subscription.id,
      razorpayOrderId: spec.paymentKey,
      razorpayPaymentId: `${spec.paymentKey}_pay`,
      razorpaySignature: `${spec.paymentKey}_sig`,
      plan: spec.plan,
      amountPaise,
      status: 'PAID',
    },
  })

  await syncMarketplaceIdentity(prisma, userId, userSpec, spec.plan)
  return subscription
}

async function seedPremiumSubscriptions(prisma, users) {
  if (!shouldSeedQaUsers()) return []

  const { PREMIUM_USERS } = require('./constants.js')
  const results = []
  for (const spec of PREMIUM_SUBSCRIPTION_SPECS) {
    const user = users[spec.email]
    const userSpec = PREMIUM_USERS.find((u) => u.email === spec.email)
    if (!user || !userSpec) continue
    results.push(await upsertPremiumSubscription(prisma, user.id, spec, userSpec))
  }
  return results
}

/** 10 seller listings — automation seller only, upserted after each bootstrap purge */
function buildAutomationProductSpecs(sellerId) {
  const picks = [
    { cat: CATALOG[0], sub: 'Smartphones', brand: 'Samsung', noun: '5G Smartphone', sku: 'E2E-MOB-001', price: 24990, moq: 5 },
    { cat: CATALOG[0], sub: 'Power Banks', brand: 'OnePlus', noun: 'Fast Charging Power Bank', sku: 'E2E-MOB-002', price: 1990, moq: 10 },
    { cat: CATALOG[1], sub: 'Laptops', brand: 'Dell', noun: 'Business Laptop', sku: 'E2E-CMP-001', price: 89990, moq: 2 },
    { cat: CATALOG[1], sub: 'Monitors', brand: 'HP', noun: 'FHD Monitor', sku: 'E2E-CMP-002', price: 14990, moq: 4 },
    { cat: CATALOG[2], sub: 'LED & Smart TVs', brand: 'LG', noun: '4K Smart TV', sku: 'E2E-TV-001', price: 54990, moq: 2 },
    { cat: CATALOG[6], sub: 'Fitness Equipment', brand: 'Nike', noun: 'Dumbbell Pair', sku: 'E2E-SPT-001', price: 4990, moq: 6 },
    { cat: CATALOG[5], sub: 'Cookware & Dining', brand: 'Prestige', noun: 'Non-stick Cookware Set', sku: 'E2E-HOM-001', price: 3490, moq: 8 },
    { cat: CATALOG[9], sub: 'Industrial Supplies', brand: 'Bosch', noun: 'Cutting Wheel Pack', sku: 'E2E-IND-001', price: 1290, moq: 20 },
    { cat: CATALOG[3], sub: 'Shirts & T-Shirts', brand: 'Allen Solly', noun: 'Formal Shirt', sku: 'E2E-FSH-001', price: 1890, moq: 12 },
    { cat: CATALOG[7], sub: 'Cricket', brand: 'Yonex', noun: 'Cricket Bat', sku: 'E2E-SPT-002', price: 5990, moq: 5 },
  ]

  return picks.map((p, index) => ({
    sellerId,
    sku: p.sku,
    name: `${p.brand} ${p.noun} — ${p.sub}`,
    description: buildDescription(p.cat.name, p.sub, p.brand, p.noun),
    price: p.price,
    moq: p.moq,
    currency: 'INR',
    isActive: true,
    trackInventory: true,
    stockQty: 100 + index * 15,
    images: buildProductImages(`e2e-${p.sku.toLowerCase()}`, `${p.sku}.jpg`),
  }))
}

async function upsertAutomationProduct(prisma, spec) {
  const product = await prisma.product.upsert({
    where: {
      sellerId_sku: { sellerId: spec.sellerId, sku: spec.sku },
    },
    update: {
      name: spec.name,
      description: spec.description,
      price: money(spec.price),
      moq: spec.moq,
      currency: spec.currency,
      isActive: spec.isActive,
      trackInventory: spec.trackInventory,
      stockQty: spec.stockQty,
      images: spec.images,
    },
    create: {
      sellerId: spec.sellerId,
      sku: spec.sku,
      name: spec.name,
      description: spec.description,
      price: money(spec.price),
      moq: spec.moq,
      currency: spec.currency,
      isActive: spec.isActive,
      trackInventory: spec.trackInventory,
      stockQty: spec.stockQty,
      reservedQty: 0,
      images: spec.images,
    },
  })

  const existingLog = await prisma.inventoryLog.findFirst({
    where: {
      productId: product.id,
      reason: 'RESTOCK',
      note: 'Automation bootstrap opening stock',
    },
  })

  if (!existingLog && product.trackInventory && product.stockQty > 0) {
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        delta: product.stockQty,
        reason: 'RESTOCK',
        performedBy: product.sellerId,
        note: 'Automation bootstrap opening stock',
      },
    })
  }

  return product
}

async function seedAutomationSellerProducts(prisma, users) {
  if (!shouldSeedQaUsers()) return []

  const seller = users[PREMIUM_AUTOMATION_SELLER.email]
  if (!seller) return []

  const specs = buildAutomationProductSpecs(seller.id)
  const products = []
  for (const spec of specs) {
    products.push(await upsertAutomationProduct(prisma, spec))
  }
  return products
}

module.exports = {
  seedPremiumSubscriptions,
  seedAutomationSellerProducts,
  buildAutomationProductSpecs,
  upsertPremiumSubscription,
  syncMarketplaceIdentity,
}
