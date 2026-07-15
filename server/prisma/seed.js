/**
 * Demo seed for testing and walkthroughs.
 *
 * Creates:
 * - Demo admin, sellers, buyers
 * - Active subscriptions and paid payment records
 * - Seller-owned transactional products with inventory
 * - Orders, order history, contact messages, category requests, addresses
 * - Public catalog categories, subcategories, brands, and 5-10 products per subcategory
 *
 * Re-runnable: demo-owned data is reset before insert.
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const crypto = require('crypto')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const { PrismaClient, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()

const PASSWORDS = {
  admin: 'admin123',
  seller123: 'seller123',
  buyer123: 'buyer123',
}

const USERS = [
  { email: 'admin@b2b.local', role: 'ADMIN', companyName: 'Platform Admin', password: PASSWORDS.admin },
  { email: 'alpha@seller.test', role: 'SELLER', companyName: 'Alpha Industrial Co.', password: PASSWORDS.seller123 },
  { email: 'bravo@seller.test', role: 'SELLER', companyName: 'Bravo Tech Traders', password: PASSWORDS.seller123 },
  { email: 'gamma@seller.test', role: 'SELLER', companyName: 'Gamma Wholesale Ltd.', password: PASSWORDS.seller123 },
  { email: 'delta@seller.test', role: 'SELLER', companyName: 'Delta Home & Lifestyle', password: PASSWORDS.seller123 },
  { email: 'buyer1@buyer.test', role: 'BUYER', companyName: 'Northwind Retail', password: PASSWORDS.buyer123 },
  { email: 'buyer2@buyer.test', role: 'BUYER', companyName: 'Contoso Imports', password: PASSWORDS.buyer123 },
  { email: 'buyer3@buyer.test', role: 'BUYER', companyName: 'Fabrikam Distribution', password: PASSWORDS.buyer123 },
  { email: 'buyer4@buyer.test', role: 'BUYER', companyName: 'Apex Wholesale Buyers', password: PASSWORDS.buyer123 },
  {
    email: 'buyer.subscribed@buyer.test',
    role: 'BUYER',
    companyName: 'Subscribed Test Buyer Co.',
    password: PASSWORDS.buyer123,
  },
  {
    email: 'buyer.free@buyer.test',
    role: 'BUYER',
    companyName: 'Free Test Buyer Co.',
    password: PASSWORDS.buyer123,
  },
]

const SELLER_EMAILS = USERS.filter((u) => u.role === 'SELLER').map((u) => u.email)
const BUYER_EMAILS = USERS.filter((u) => u.role === 'BUYER').map((u) => u.email)
const DEMO_EMAILS = USERS.map((u) => u.email)

const CATALOG = [
  {
    name: 'Moblie & accessories',
    slug: 'mobiles',
    brands: ['Apple', 'Samsung', 'OnePlus', 'realme', 'Xiaomi', 'vivo', 'Nokia', 'Motorola'],
    subcategories: ['Smartphones', 'Cases & Covers', 'Screen Protectors', 'Power Banks', 'Tablets', 'Wearables'],
    nouns: ['5G Smartphone', 'Rugged Back Cover', 'Tempered Glass Guard', 'Fast Charging Power Bank', 'Android Tablet', 'Smart Watch'],
  },
  {
    name: 'Computers & Accessories',
    slug: 'computers',
    brands: ['Dell', 'HP', 'Lenovo', 'Acer', 'ASUS', 'Logitech', 'TP-Link'],
    subcategories: ['Laptops', 'Storage Drives', 'Printers & Ink', 'Networking Devices', 'Keyboards & Mice', 'Monitors'],
    nouns: ['Business Laptop', 'NVMe SSD', 'Laser Printer', 'Gigabit Router', 'Wireless Keyboard Combo', 'FHD Monitor'],
  },
  {
    name: 'TV, Appliances, Electronics',
    slug: 'tv',
    brands: ['LG', 'Samsung', 'Sony', 'TCL', 'Panasonic', 'Philips'],
    subcategories: ['LED & Smart TVs', 'Home Audio', 'Kitchen Appliances', 'Air Conditioners', 'Refrigerators', 'Washing Machines'],
    nouns: ['4K Smart TV', 'Bluetooth Soundbar', 'Mixer Grinder', 'Inverter Split AC', 'Double Door Refrigerator', 'Front Load Washer'],
  },
  {
    name: "Men's Fashion",
    slug: 'mens-fashion',
    brands: ['Allen Solly', 'Van Heusen', 'Peter England', 'U.S. Polo Assn.', 'Jockey', 'Boldfit'],
    subcategories: ['Shirts & T-Shirts', 'Jeans & Trousers', 'Footwear', 'Watches', 'Bags & Wallets', 'Winterwear'],
    nouns: ['Formal Shirt', 'Stretch Chino', 'Casual Sneaker', 'Analog Watch', 'Leather Wallet', 'Fleece Jacket'],
  },
  {
    name: "Women's Fashion",
    slug: 'womens-fashion',
    brands: ['GoSriKi', 'ANNI DESIGNER', 'GRECIILOOKS', 'Enamor', 'Leriya Fashion', 'Van Heusen'],
    subcategories: ['Ethnic Wear', 'Western Wear', 'Footwear', 'Jewelry', 'Handbags', 'Innerwear'],
    nouns: ['Cotton Kurti', 'Western Top', 'Comfort Flats', 'Fashion Earrings', 'Structured Handbag', 'Everyday Innerwear Set'],
  },
  {
    name: 'Home, Kitchen, Pets',
    slug: 'home-kitchen',
    brands: ['Prestige', 'Pigeon', 'Milton', 'Cello', 'Solimo', 'AGARO'],
    subcategories: ['Furniture', 'Cookware & Dining', 'Home Decor', 'Pet Supplies', 'Bedding & Linen', 'Bath & Cleaning'],
    nouns: ['Office Chair', 'Non-stick Cookware Set', 'Wall Decor Set', 'Pet Food Bowl', 'Cotton Bedsheet', 'Microfiber Mop'],
  },
  {
    name: 'Beauty, Health, Grocery',
    slug: 'beauty',
    brands: ['Lakme', 'Maybelline', 'NIVEA', 'L’Oreal', 'Himalaya', 'Tata Sampann'],
    subcategories: ['Makeup', 'Skin Care', 'Health & Wellness', 'Grocery Staples', 'Snacks & Beverages', 'Personal Care'],
    nouns: ['Matte Lipstick', 'Face Cleanser', 'Vitamin Supplement', 'Basmati Rice Pack', 'Energy Snack Box', 'Shampoo Bottle'],
  },
  {
    name: 'Sports, Fitness, Bags, Luggage',
    slug: 'sports',
    brands: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Yonex', 'American Tourister'],
    subcategories: ['Cricket', 'Fitness Equipment', 'Outdoor Recreation', 'Bags & Luggage', 'Cycling', 'Team Sports'],
    nouns: ['Cricket Bat', 'Dumbbell Pair', 'Camping Lantern', 'Travel Trolley', 'Cycling Helmet', 'Football Kit'],
  },
  {
    name: "Toys, Baby Products, Kids' Fashion",
    slug: 'toys',
    brands: ['Lego', 'Mattel', 'Funskool', 'Hot Wheels', 'Mee Mee', 'Babyhug'],
    subcategories: ['Toys & Games', 'Baby Products', "Kids' Fashion", 'Remote Control Toys', 'Board Games', 'School Supplies'],
    nouns: ['Building Blocks Set', 'Baby Feeding Bottle', 'Kids Cotton T-Shirt', 'RC Car', 'Board Game', 'School Backpack'],
  },
  {
    name: 'Car, Motorbike, Industrial',
    slug: 'car',
    brands: ['Bosch', '3M', 'Philips', 'Mahle', 'Stanley', 'Godrej'],
    subcategories: ['Car Accessories', 'Car Care', 'Motorbike Accessories', 'Industrial Supplies', 'Tools & Hardware', 'Safety Equipment'],
    nouns: ['Car Vacuum Cleaner', 'Microfiber Cleaning Kit', 'Bike Helmet', 'Cutting Wheel Pack', 'Tool Kit', 'Safety Helmet'],
  },
  {
    name: 'Books',
    slug: 'books',
    brands: ['Penguin', 'HarperCollins', 'Rupa', 'Bloomsbury', 'Arihant', 'Oxford'],
    subcategories: ['Fiction', 'Non-Fiction', 'Textbooks', 'Exam Prep', "Children's Books", 'Business Books'],
    nouns: ['Paperback Fiction Bundle', 'Biography Set', 'School Textbook Pack', 'Exam Guide', 'Picture Book Set', 'Management Book'],
  },
  {
    name: 'Movies, Music & Video Games',
    slug: 'movies',
    brands: ['Marvel', 'Disney', 'Sony Music', 'Universal', 'Nintendo', 'PlayStation'],
    subcategories: ['Movies & TV', 'Music', 'Video Games', 'Gaming Accessories', 'Instruments', 'Collectibles'],
    nouns: ['Blu-ray Box Set', 'Audio CD Collection', 'Console Game', 'Gaming Controller', 'Acoustic Guitar', 'Character Figurine'],
  },
]

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function money(value) {
  return new Prisma.Decimal(String(value))
}

function orderNumber(idx) {
  return `ORD-DEMO-${String(idx).padStart(4, '0')}`
}

function demoPaymentId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function productPrice(categoryIndex, subIndex, productIndex) {
  const base = 450 + categoryIndex * 275 + subIndex * 165
  const stepped = base + productIndex * 310
  return Math.round(stepped / 10) * 10
}

function stockQty(categoryIndex, subIndex, productIndex) {
  return 80 + categoryIndex * 10 + subIndex * 7 + productIndex * 13
}

function sellerForIndex(users, index) {
  return users[SELLER_EMAILS[index % SELLER_EMAILS.length]]
}

function getUiCategoryNodes() {
  const treePath = path.join(__dirname, '../../client/src/utils/shopCategoryTree.js')
  const source = fs.readFileSync(treePath, 'utf8')
  const matches = source.matchAll(/\{\s*id:\s*(['"])(.*?)\1,\s*label:\s*(['"])(.*?)\3/g)
  const seen = new Set()
  const nodes = []

  for (const match of matches) {
    const id = match[2]
    const label = match[4]
    if (!id || !label || seen.has(id)) continue
    seen.add(id)
    nodes.push({ id, label })
  }

  return nodes
}

function generateCatalogProducts() {
  const rows = []
  let idx = 0
  CATALOG.forEach((category, categoryIndex) => {
    category.subcategories.forEach((subcategory, subIndex) => {
      for (let productIndex = 0; productIndex < 6; productIndex += 1) {
        const brand = category.brands[(subIndex + productIndex) % category.brands.length]
        const noun = category.nouns[subIndex % category.nouns.length]
        idx += 1
        rows.push({
          title: `${brand} ${noun} ${productIndex + 1}`,
          description: `${subcategory} demo product for ${category.name}. Includes realistic pricing, filterable category data, and placeholder imagery for demo browsing.`,
          price: productPrice(categoryIndex, subIndex, productIndex),
          imageUrl: `https://picsum.photos/seed/b2b-${category.slug}-${slugify(subcategory)}-${productIndex}/700/700`,
          categorySlug: `${category.slug}-${slugify(subcategory)}`,
          categoryName: subcategory,
          parentSlug: category.slug,
          parentName: category.name,
          brandName: brand,
          brandSlug: slugify(brand),
          createdOffsetMinutes: idx * 3,
        })
      }
    })
  })
  return rows
}

function generateUiSubcategoryProducts(uiNodes, categoryIds, brandSlugs) {
  const topLevelIds = new Set(CATALOG.map((category) => category.slug))
  const rows = []
  let idx = 0

  for (const node of uiNodes) {
    if (topLevelIds.has(node.id)) continue
    if (!categoryIds[node.id]) continue

    for (let productIndex = 0; productIndex < 5; productIndex += 1) {
      const brandSlug = brandSlugs[(idx + productIndex) % brandSlugs.length]
      const brandName = brandSlug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

      rows.push({
        title: `${brandName} ${node.label} Demo Pack ${productIndex + 1}`,
        description: `${node.label} demo product for category and subcategory testing. Includes searchable product data, realistic price, and placeholder image.`,
        price: 350 + idx * 40 + productIndex * 225,
        imageUrl: `https://picsum.photos/seed/b2b-ui-${node.id}-${productIndex}/700/700`,
        categorySlug: node.id,
        categoryName: node.label,
        brandSlug,
        createdOffsetMinutes: 1000 + idx * 5 + productIndex,
      })
    }

    idx += 1
  }

  return rows
}

function generateSellerProducts(users) {
  const rows = []
  let idx = 0
  CATALOG.forEach((category, categoryIndex) => {
    category.subcategories.slice(0, 2).forEach((subcategory, subIndex) => {
      for (let productIndex = 0; productIndex < 1; productIndex += 1) {
        const seller = sellerForIndex(users, idx)
        const brand = category.brands[(productIndex + subIndex) % category.brands.length]
        const noun = category.nouns[subIndex % category.nouns.length]
        const sku = `${category.slug.slice(0, 3).toUpperCase()}-${slugify(subcategory).slice(0, 8).toUpperCase()}-${String(productIndex + 1).padStart(2, '0')}`
        rows.push({
          sellerId: seller.id,
          sku,
          name: `${brand} ${noun} - ${subcategory}`,
          description: `${category.name} / ${subcategory}. Demo seller listing with stock, MOQ, and order-ready data.`,
          price: productPrice(categoryIndex, subIndex, productIndex + 1),
          moq: 5 + ((categoryIndex + subIndex + productIndex) % 8),
          currency: 'INR',
          isActive: true,
          trackInventory: true,
          stockQty: stockQty(categoryIndex, subIndex, productIndex),
        })
        idx += 1
      }
    })
  })
  return rows
}

async function upsertUsers() {
  const users = {}
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    users[user.email] = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role: user.role,
        companyName: user.companyName,
        passwordHash,
      },
      create: {
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        passwordHash,
      },
    })
  }
  return users
}

async function clearDemoData(users) {
  const userIds = Object.values(users).map((u) => u.id)
  const sellerIds = SELLER_EMAILS.map((email) => users[email].id)

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { buyerId: { in: userIds } },
        { sellerId: { in: userIds } },
      ],
    },
    select: { id: true },
  })
  const orderIds = orders.map((o) => o.id)

  const products = await prisma.product.findMany({
    where: { sellerId: { in: sellerIds } },
    select: { id: true },
  })
  const productIds = products.map((p) => p.id)

  await prisma.orderHistory.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
  await prisma.inventoryLog.deleteMany({ where: { productId: { in: productIds } } })
  await prisma.product.deleteMany({ where: { id: { in: productIds } } })
  await prisma.payment.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.contactMessage.deleteMany({ where: { senderId: { in: userIds } } })
  await prisma.categoryRequest.deleteMany({ where: { sellerId: { in: sellerIds } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } })
}

async function seedSubscriptionsAndPayments(users) {
  const specs = [
    { email: 'buyer1@buyer.test', plan: 'BUYER_STANDARD', amount: 499900, expiresAt: null },
    { email: 'buyer2@buyer.test', plan: 'BUYER_LIFETIME', amount: 499900, expiresAt: null },
    { email: 'buyer3@buyer.test', plan: 'BUYER_STANDARD', amount: 499900, expiresAt: null },
    { email: 'buyer.subscribed@buyer.test', plan: 'BUYER_LIFETIME', amount: 4999900, expiresAt: null },
    { email: 'alpha@seller.test', plan: 'SELLER_LIFETIME', amount: 2999900, expiresAt: null },
    { email: 'bravo@seller.test', plan: 'SELLER_MONTH', amount: 199900, expiresAt: new Date(Date.now() + 30 * 86400_000) },
    { email: 'gamma@seller.test', plan: 'SELLER_LIFETIME', amount: 2999900, expiresAt: null },
    { email: 'delta@seller.test', plan: 'SELLER_MONTH', amount: 199900, expiresAt: new Date(Date.now() + 30 * 86400_000) },
  ]

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i]
    const user = users[spec.email]
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: spec.plan,
        status: 'ACTIVE',
        expiresAt: spec.expiresAt,
      },
    })
    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        razorpayOrderId: `order_demo_${String(i + 1).padStart(4, '0')}`,
        razorpayPaymentId: demoPaymentId('pay_demo'),
        razorpaySignature: demoPaymentId('sig_demo'),
        plan: spec.plan,
        amountPaise: spec.amount,
        currency: 'INR',
        status: 'PAID',
      },
    })
  }
}

async function seedAddresses(users) {
  const cities = [
    ['Mumbai', 'Maharashtra', '400001'],
    ['Delhi', 'Delhi', '110001'],
    ['Bengaluru', 'Karnataka', '560001'],
    ['Chennai', 'Tamil Nadu', '600001'],
    ['Ahmedabad', 'Gujarat', '380001'],
    ['Hyderabad', 'Telangana', '500001'],
  ]

  let index = 0
  for (const email of [...BUYER_EMAILS, ...SELLER_EMAILS]) {
    const [city, state, postalCode] = cities[index % cities.length]
    const label = SELLER_EMAILS.includes(email) ? 'Warehouse' : 'Head Office'
    await prisma.address.create({
      data: {
        userId: users[email].id,
        label,
        line1: `${101 + index}, Demo Trade Park`,
        line2: 'Industrial Area',
        city,
        state,
        postalCode,
        country: 'IN',
        phone: `98765000${String(index).padStart(2, '0')}`,
        isDefault: true,
      },
    })
    index += 1
  }
}

async function seedSellerProducts(users) {
  const specs = generateSellerProducts(users)
  const products = specs.map((spec) => ({
    id: crypto.randomUUID(),
    ...spec,
    price: money(spec.price),
    reservedQty: 0,
  }))

  await prisma.product.createMany({
    data: products.map((product) => ({
      id: product.id,
      sellerId: product.sellerId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      moq: product.moq,
      currency: product.currency,
      isActive: product.isActive,
      trackInventory: product.trackInventory,
      stockQty: product.stockQty,
      reservedQty: product.reservedQty,
    })),
  })

  await prisma.inventoryLog.createMany({
    data: products.map((product) => ({
      id: crypto.randomUUID(),
      productId: product.id,
      delta: product.stockQty,
      reason: 'RESTOCK',
      performedBy: product.sellerId,
      note: 'Demo opening stock',
    })),
  })

  return products
}

async function seedOrders(users, products) {
  const orders = []
  const orderItems = []
  const orderHistory = []
  const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
  const buyerIds = BUYER_EMAILS.map((email) => users[email].id)

  for (let i = 0; i < 10; i += 1) {
    const product = products[i % products.length]
    const secondProduct = products.find((p) => p.sellerId === product.sellerId && p.id !== product.id)
    const buyerId = buyerIds[i % buyerIds.length]
    const status = statuses[i % statuses.length]
    const lineSpecs = [
      { product, quantity: product.moq + (i % 4) },
      ...(secondProduct ? [{ product: secondProduct, quantity: secondProduct.moq + 1 }] : []),
    ]

    let total = money(0)
    const items = lineSpecs.map((line) => {
      const unitPrice = money(line.product.price)
      const lineTotal = unitPrice.mul(line.quantity)
        total = total.add(lineTotal)
        return {
        productId: line.product.id,
        quantity: line.quantity,
          unitPrice,
          lineTotal,
        }
      })

    const order = {
      id: crypto.randomUUID(),
      orderNumber: orderNumber(i + 1),
      buyerId,
      sellerId: product.sellerId,
      status,
      totalAmount: total,
      notes: `Demo ${status.toLowerCase()} order for testing dashboards and order details.`,
      shippingSnapshot: {
        line1: 'Demo Trade Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
      billingSnapshot: {
        line1: 'Demo Trade Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
    }
    orders.push(order)

    orderItems.push(
      ...items.map((item) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    )

    orderHistory.push({
      id: crypto.randomUUID(),
      orderId: order.id,
      fromStatus: null,
      toStatus: 'PENDING',
      note: 'Demo order created',
      changedById: buyerId,
    })

    if (status !== 'PENDING') {
      orderHistory.push({
        id: crypto.randomUUID(),
        orderId: order.id,
        fromStatus: 'PENDING',
        toStatus: status,
        note: `Demo status changed to ${status}`,
        changedById: product.sellerId,
      })
    }
  }

  await prisma.order.createMany({ data: orders })
  await prisma.orderItem.createMany({ data: orderItems })
  await prisma.orderHistory.createMany({ data: orderHistory })

  return orders
}

async function seedMessagesAndRequests(users) {
  const messages = [
    ['buyer1@buyer.test', 'Need GST invoice copy', 'Please help me download the GST invoice for my last order.', 'UNREAD'],
    ['buyer2@buyer.test', 'Bulk buyer onboarding', 'We want to add three procurement users for our team.', 'REPLIED'],
    ['alpha@seller.test', 'Product upload support', 'Can admin review the rejected SKU data for our steel catalog?', 'READ'],
    ['gamma@seller.test', 'Payment confirmation', 'Please confirm whether lifetime seller subscription is active.', 'REPLIED'],
  ]

  for (const [email, subject, message, status] of messages) {
    await prisma.contactMessage.create({
      data: {
        senderId: users[email].id,
        subject,
        message,
        status,
        adminReply: status === 'REPLIED' ? 'Thanks, we reviewed this demo request and updated the account.' : null,
        repliedAt: status === 'REPLIED' ? new Date() : null,
        replyRead: false,
      },
    })
  }

  const requests = [
    ['alpha@seller.test', 'CATEGORY', 'Packaging Materials', null, 'Need a top-level category for B2B cartons and pallet wraps.', 'PENDING'],
    ['bravo@seller.test', 'SUBCATEGORY', 'Industrial Monitors', 'Computers & Accessories', 'Dedicated subcategory for rugged industrial displays.', 'APPROVED'],
    ['gamma@seller.test', 'SUBCATEGORY', 'Organic Staples', 'Beauty, Health, Grocery', 'Food-grade grocery bulk listings for organic staples.', 'REJECTED'],
    ['delta@seller.test', 'CATEGORY', 'Hospitality Supplies', null, 'Hotels and cafes need disposable, linen, and housekeeping products.', 'PENDING'],
  ]

  for (const [email, requestType, categoryName, parentCategoryName, description, status] of requests) {
    await prisma.categoryRequest.create({
        data: {
        sellerId: users[email].id,
        requestType,
        categoryName,
        parentCategoryName,
        description,
        status,
        adminNote: status === 'PENDING' ? null : `Demo admin note: ${status.toLowerCase()} request.`,
        notificationRead: false,
      },
    })
  }
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNullable(value) {
  return value == null ? 'NULL' : sqlString(value)
}

async function seedCatalogSchema() {
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS catalog')
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      parent_id INTEGER REFERENCES catalog.categories(id) ON DELETE SET NULL
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.brands (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS catalog.products (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      image_url TEXT,
      category_id INTEGER NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
      brand_id INTEGER NOT NULL REFERENCES catalog.brands(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_categories_parent_id ON catalog.categories (parent_id)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_created_at_id ON catalog.products (created_at DESC, id DESC)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_category_id ON catalog.products (category_id)')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id ON catalog.products (brand_id)')

  await prisma.$executeRawUnsafe('TRUNCATE TABLE catalog.products RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE catalog.categories RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE catalog.brands RESTART IDENTITY CASCADE')

  const categoryIds = {}
  const categoryRows = []
  let nextCategoryId = 1

  for (const category of CATALOG) {
    const parentId = nextCategoryId
    nextCategoryId += 1
    categoryIds[category.slug] = parentId
    categoryRows.push({
      id: parentId,
      name: category.name,
      slug: category.slug,
      parentId: null,
    })

    for (const subcategory of category.subcategories) {
      const slug = `${category.slug}-${slugify(subcategory)}`
      const childId = nextCategoryId
      nextCategoryId += 1
      categoryIds[slug] = childId
      categoryRows.push({
        id: childId,
        name: subcategory,
        slug,
        parentId,
      })
    }
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO catalog.categories (id, name, slug, parent_id)
    VALUES ${categoryRows
      .map((row) => `(${row.id}, ${sqlString(row.name)}, ${sqlString(row.slug)}, ${row.parentId ?? 'NULL'})`)
      .join(',\n')}
  `)
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('catalog.categories', 'id'), ${nextCategoryId - 1}, true)`,
  )

  const brandIds = {}
  const allBrands = [...new Set(CATALOG.flatMap((category) => category.brands))]
  const brandRows = allBrands.map((brand, index) => ({
    id: index + 1,
    name: brand,
    slug: slugify(brand),
  }))

  for (const { id, slug } of brandRows) {
    brandIds[slug] = id
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO catalog.brands (id, name, slug)
    VALUES ${brandRows
      .map((row) => `(${row.id}, ${sqlString(row.name)}, ${sqlString(row.slug)})`)
      .join(',\n')}
  `)
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('catalog.brands', 'id'), ${brandRows.length}, true)`,
  )

  const catalogProducts = generateCatalogProducts()
  const productRows = catalogProducts.map((p, index) => ({
    id: index + 1,
    title: p.title,
    description: p.description,
    price: p.price,
    imageUrl: p.imageUrl,
    categoryId: categoryIds[p.categorySlug],
    brandId: brandIds[p.brandSlug],
    createdOffsetMinutes: p.createdOffsetMinutes,
  }))

  for (let i = 0; i < productRows.length; i += 100) {
    const chunk = productRows.slice(i, i + 100)
    await prisma.$executeRawUnsafe(`
      INSERT INTO catalog.products
        (id, title, description, price, image_url, category_id, brand_id, created_at)
      VALUES ${chunk
        .map((row) => {
          return `(${row.id}, ${sqlString(row.title)}, ${sqlNullable(row.description)}, ${row.price}, ${sqlString(row.imageUrl)}, ${row.categoryId}, ${row.brandId}, NOW() - INTERVAL '${row.createdOffsetMinutes} minutes')`
        })
        .join(',\n')}
    `)
  }
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('catalog.products', 'id'), ${productRows.length}, true)`,
  )

  return {
    categories: CATALOG.length,
    subcategories: CATALOG.reduce((sum, category) => sum + category.subcategories.length, 0),
    products: catalogProducts.length,
    brands: allBrands.length,
  }
}

const LEGACY_DEMO_EMAILS = ['buyer.free@test', 'buyer.subscribed@test']

async function removeLegacyDemoUsers() {
  const legacy = await prisma.user.findMany({
    where: { email: { in: LEGACY_DEMO_EMAILS } },
    select: { id: true },
  })
  if (!legacy.length) return
  const ids = legacy.map((u) => u.id)
  await prisma.payment.deleteMany({ where: { userId: { in: ids } } })
  await prisma.subscription.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

async function main() {
  console.log('[seed] removing legacy demo users (invalid email formats)')
  await removeLegacyDemoUsers()

  console.log('[seed] upserting demo users')
  const users = await upsertUsers()

  console.log('[seed] clearing old demo data')
  await clearDemoData(users)

  console.log('[seed] creating subscriptions, addresses, products, orders, requests, messages')
  await seedSubscriptionsAndPayments(users)
  await seedAddresses(users)
  const sellerProducts = await seedSellerProducts(users)
  const orders = await seedOrders(users, sellerProducts)
  await seedMessagesAndRequests(users)

  console.log('[seed] creating public catalog categories/subcategories/products')
  const catalogStats = await seedCatalogSchema()

  console.log('')
  console.log('[seed] Demo credentials')
  console.log('[seed]   admin:  admin@b2b.local      (admin123)')
  console.log('[seed]   seller: alpha@seller.test    (seller123) — subscribed seller')
  console.log('[seed]   seller: bravo@seller.test    (seller123)')
  console.log('[seed]   seller: gamma@seller.test    (seller123)')
  console.log('[seed]   seller: delta@seller.test    (seller123)')
  console.log('[seed]   buyer:  buyer.subscribed@buyer.test (buyer123) — subscribed (wishlist, negotiate, quotes)')
  console.log('[seed]   buyer:  buyer.free@buyer.test       (buyer123) — not subscribed (test paywall / alerts)')
  console.log('[seed]   buyer:  buyer1@buyer.test    (buyer123) — subscribed')
  console.log('[seed]   buyer:  buyer2@buyer.test    (buyer123) — subscribed')
  console.log('[seed]   buyer:  buyer3@buyer.test    (buyer123) — subscribed')
  console.log('[seed]   buyer:  buyer4@buyer.test    (buyer123) — not subscribed')
  console.log('')
  console.log('[seed] Demo summary')
  console.log(`[seed]   catalog categories:    ${catalogStats.categories}`)
  console.log(`[seed]   catalog subcategories: ${catalogStats.subcategories}`)
  console.log(`[seed]   catalog products:      ${catalogStats.products}`)
  console.log(`[seed]   catalog brands:        ${catalogStats.brands}`)
  console.log(`[seed]   seller products:       ${sellerProducts.length}`)
  console.log(`[seed]   orders:                ${orders.length}`)
  console.log(`[seed]   users:                 ${DEMO_EMAILS.length}`)
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
