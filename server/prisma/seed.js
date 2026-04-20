/**
 * Prisma seed — creates a full dataset for end-to-end demos:
 *   - 1 admin
 *   - 3 sellers  (each with products)
 *   - 3 buyers
 *   - 15 products spread across sellers
 *   - 6 orders with items (mix of statuses)
 *
 * Re-runnable: uses upsert on users (by email), and skips product/order
 * creation if products already exist for the seeded sellers.
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()

const USERS = [
  { email: 'admin@b2b.local',   password: 'admin123',  role: 'ADMIN',  companyName: 'Platform Admin' },

  { email: 'alpha@seller.test',  password: 'seller123', role: 'SELLER', companyName: 'Alpha Industrial Co.' },
  { email: 'bravo@seller.test',  password: 'seller123', role: 'SELLER', companyName: 'Bravo Tech Traders'   },
  { email: 'gamma@seller.test',  password: 'seller123', role: 'SELLER', companyName: 'Gamma Wholesale Ltd.'  },

  { email: 'buyer1@buyer.test',  password: 'buyer123',  role: 'BUYER',  companyName: 'Northwind Retail'     },
  { email: 'buyer2@buyer.test',  password: 'buyer123',  role: 'BUYER',  companyName: 'Contoso Imports'      },
  { email: 'buyer3@buyer.test',  password: 'buyer123',  role: 'BUYER',  companyName: 'Fabrikam Distribution'},
]

/** Products keyed by seller email. */
const PRODUCTS_BY_SELLER = {
  'alpha@seller.test': [
    { sku: 'ALP-STL-12MM',   name: 'Cold Rolled Steel Sheet 12mm',   description: 'High-grade CR steel sheet, 1250x2500mm, IS513 compliant.', price: 58500, moq: 5  },
    { sku: 'ALP-STL-05MM',   name: 'Cold Rolled Steel Sheet 5mm',    description: 'High-grade CR steel sheet, 1000x2000mm.',                   price: 26500, moq: 10 },
    { sku: 'ALP-ANG-40X40',  name: 'MS Angle 40x40x5mm',             description: 'Mild steel structural angle, 6m length.',                   price: 4200,  moq: 20 },
    { sku: 'ALP-PIPE-GI-50', name: 'GI Pipe 50mm Medium Class',      description: 'Galvanized iron pipe, 6m, BIS tested.',                     price: 3150,  moq: 25 },
    { sku: 'ALP-WIRE-BIND',  name: 'Binding Wire 18 Gauge (50kg)',   description: 'Soft galvanized binding wire coil.',                        price: 4800,  moq: 4  },
  ],
  'bravo@seller.test': [
    { sku: 'BRV-LAP-14-I5',  name: 'Business Laptop 14" i5',         description: '8GB RAM, 512GB SSD, Windows 11 Pro. Bulk SKU.',             price: 54990, moq: 3  },
    { sku: 'BRV-MON-24-FHD', name: '24" FHD Monitor',                description: 'IPS 75Hz monitor with HDMI + VGA, VESA mount.',              price: 9499,  moq: 5  },
    { sku: 'BRV-HDS-BT-OE',  name: 'Bluetooth Over-Ear Headset',     description: 'ENC mic, 40h battery, ideal for call-centres.',             price: 1999,  moq: 10 },
    { sku: 'BRV-KEYB-WIRED', name: 'USB Wired Keyboard (Pack of 10)',description: 'Spill-resistant, 3-year warranty, office-grade.',           price: 3999,  moq: 2  },
    { sku: 'BRV-UPS-600VA',  name: 'UPS 600VA Line-Interactive',     description: 'Short-circuit & overload protection.',                       price: 3299,  moq: 4  },
  ],
  'gamma@seller.test': [
    { sku: 'GAM-RICE-25KG',  name: 'Basmati Rice 25kg',              description: 'Aged long-grain basmati, export quality.',                  price: 3200,  moq: 10 },
    { sku: 'GAM-SALT-50KG',  name: 'Refined Iodized Salt 50kg',      description: 'Food-grade refined salt, FSSAI compliant.',                  price: 950,   moq: 20 },
    { sku: 'GAM-TEA-CTC-10', name: 'Assam CTC Tea 10kg',             description: 'Bulk tea carton, factory-fresh.',                            price: 2400,  moq: 5  },
    { sku: 'GAM-OIL-SFL-15', name: 'Sunflower Oil 15L Tin',          description: 'Refined sunflower oil tin.',                                price: 2100,  moq: 8  },
    { sku: 'GAM-WHT-FLR-50', name: 'Wheat Flour 50kg',               description: 'Chakki-ground atta for retail packaging.',                  price: 1850,  moq: 10 },
  ],
}

async function upsertUser({ email, password, role, companyName }) {
  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: { role, companyName },
    create: { email, passwordHash, role, companyName },
  })
}

function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function main() {
  console.log('[seed] upserting users…')
  const users = {}
  for (const u of USERS) {
    const row = await upsertUser(u)
    users[u.email] = row
    console.log(`  ${u.role.padEnd(6)} ${u.email}  ${u.password ? `(pw: ${u.password})` : ''}`)
  }

  console.log('[seed] seeding products for sellers…')
  let createdProductsCount = 0
  for (const [sellerEmail, items] of Object.entries(PRODUCTS_BY_SELLER)) {
    const seller = users[sellerEmail]
    if (!seller) continue
    for (const p of items) {
      const existing = await prisma.product.findUnique({
        where: { sellerId_sku: { sellerId: seller.id, sku: p.sku } },
      })
      if (existing) continue
      await prisma.product.create({
        data: {
          sellerId: seller.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          price: new Prisma.Decimal(p.price),
          moq: p.moq,
          currency: 'INR',
          isActive: true,
        },
      })
      createdProductsCount += 1
    }
  }
  console.log(`  created ${createdProductsCount} new product(s)`)

  // Only seed orders if none exist yet (idempotent).
  const existingOrders = await prisma.order.count()
  if (existingOrders > 0) {
    console.log(`[seed] orders already present (${existingOrders}); skipping order seed`)
  } else {
    console.log('[seed] creating sample orders…')
    const alphaProducts = await prisma.product.findMany({
      where: { seller: { email: 'alpha@seller.test' } },
    })
    const bravoProducts = await prisma.product.findMany({
      where: { seller: { email: 'bravo@seller.test' } },
    })
    const gammaProducts = await prisma.product.findMany({
      where: { seller: { email: 'gamma@seller.test' } },
    })

    const buyer1 = users['buyer1@buyer.test']
    const buyer2 = users['buyer2@buyer.test']
    const buyer3 = users['buyer3@buyer.test']

    const alphaSeller = users['alpha@seller.test']
    const bravoSeller = users['bravo@seller.test']
    const gammaSeller = users['gamma@seller.test']

    const orderSpecs = [
      {
        buyer: buyer1, seller: alphaSeller, status: 'PENDING',
        lines: [
          { product: alphaProducts[0], qty: 10 },
          { product: alphaProducts[2], qty: 40 },
        ],
      },
      {
        buyer: buyer1, seller: bravoSeller, status: 'CONFIRMED',
        lines: [
          { product: bravoProducts[0], qty: 5 },
        ],
      },
      {
        buyer: buyer2, seller: bravoSeller, status: 'SHIPPED',
        lines: [
          { product: bravoProducts[1], qty: 10 },
          { product: bravoProducts[2], qty: 20 },
        ],
      },
      {
        buyer: buyer2, seller: gammaSeller, status: 'DELIVERED',
        lines: [
          { product: gammaProducts[0], qty: 20 },
          { product: gammaProducts[3], qty: 10 },
        ],
      },
      {
        buyer: buyer3, seller: alphaSeller, status: 'CANCELLED',
        lines: [
          { product: alphaProducts[1], qty: 15 },
        ],
      },
      {
        buyer: buyer3, seller: gammaSeller, status: 'PENDING',
        lines: [
          { product: gammaProducts[1], qty: 30 },
          { product: gammaProducts[4], qty: 15 },
        ],
      },
    ]

    for (const spec of orderSpecs) {
      if (!spec.buyer || !spec.seller || spec.lines.some((l) => !l.product)) continue
      let total = new Prisma.Decimal(0)
      const lineData = spec.lines.map((l) => {
        const unitPrice = new Prisma.Decimal(l.product.price.toString())
        const lineTotal = unitPrice.mul(l.qty)
        total = total.add(lineTotal)
        return {
          productId: l.product.id,
          quantity: l.qty,
          unitPrice,
          lineTotal,
        }
      })
      await prisma.order.create({
        data: {
          orderNumber: orderNumber(),
          buyerId: spec.buyer.id,
          sellerId: spec.seller.id,
          status: spec.status,
          totalAmount: total,
          items: { create: lineData },
        },
      })
    }
    const orderCount = await prisma.order.count()
    console.log(`  created ${orderCount} order(s)`)
  }

  console.log('')
  console.log('[seed] ============================================================')
  console.log('[seed] Demo credentials (password shown in parentheses):')
  console.log('[seed]   admin:  admin@b2b.local     (admin123)')
  console.log('[seed]   seller: alpha@seller.test   (seller123)')
  console.log('[seed]   seller: bravo@seller.test   (seller123)')
  console.log('[seed]   seller: gamma@seller.test   (seller123)')
  console.log('[seed]   buyer:  buyer1@buyer.test   (buyer123)')
  console.log('[seed]   buyer:  buyer2@buyer.test   (buyer123)')
  console.log('[seed]   buyer:  buyer3@buyer.test   (buyer123)')
  console.log('[seed] ============================================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
