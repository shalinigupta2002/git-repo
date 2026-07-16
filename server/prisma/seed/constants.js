/**
 * Production bootstrap — login accounts + master catalog taxonomy only.
 * Subscription plans / pricing live in server/src/config/subscriptionPlans.js (not DB).
 */

const PASSWORDS = {
  admin: 'Admin@123',
  buyer: 'Buyer@123',
  seller: 'Seller@123',
}

const ADMIN = {
  email: 'admin@b2b.local',
  role: 'ADMIN',
  companyName: 'B2B Marketplace Platform',
  password: PASSWORDS.admin,
}

const BUYERS = [
  { email: 'buyer1@test.com', companyName: 'Northwind Retail Pvt Ltd' },
  { email: 'buyer2@test.com', companyName: 'Contoso Imports India' },
  { email: 'buyer3@test.com', companyName: 'Fabrikam Distribution Co' },
  { email: 'buyer4@test.com', companyName: 'Apex Wholesale Buyers' },
  { email: 'buyer5@test.com', companyName: 'Summit Procurement Services' },
].map((u) => ({ ...u, role: 'BUYER', password: PASSWORDS.buyer }))

const SELLERS = [
  { email: 'seller1@test.com', companyName: 'Alpha Industrial Co.' },
  { email: 'seller2@test.com', companyName: 'Bravo Tech Traders' },
  { email: 'seller3@test.com', companyName: 'Gamma Wholesale Ltd.' },
  { email: 'seller4@test.com', companyName: 'Delta Home & Lifestyle' },
  { email: 'seller5@test.com', companyName: 'Echo Engineering Supplies' },
].map((u) => ({ ...u, role: 'SELLER', password: PASSWORDS.seller }))

/** Accounts created by earlier demo seeds — removed on bootstrap re-run */
const LEGACY_DEMO_EMAILS = [
  'buyer.sub1@test.com',
  'buyer.sub2@test.com',
  'buyer.sub3@test.com',
  'seller.sub1@test.com',
  'seller.sub2@test.com',
  'seller.sub3@test.com',
  'buyer1@buyer.test',
  'buyer2@buyer.test',
  'buyer3@buyer.test',
  'buyer4@buyer.test',
  'buyer.subscribed@buyer.test',
  'buyer.free@buyer.test',
  'alpha@seller.test',
  'bravo@seller.test',
  'gamma@seller.test',
  'delta@seller.test',
]

const LOGIN_USER_SPECS = [ADMIN, ...BUYERS, ...SELLERS]

const LOGIN_EMAILS = LOGIN_USER_SPECS.map((u) => u.email)

/** Master catalog taxonomy (categories, subcategories, brands) — no demo products */
const CATALOG = [
  {
    name: 'Mobile & Accessories',
    slug: 'mobiles',
    brands: ['Apple', 'Samsung', 'OnePlus', 'realme', 'Xiaomi', 'vivo', 'Nokia', 'Motorola'],
    subcategories: ['Smartphones', 'Cases & Covers', 'Screen Protectors', 'Power Banks', 'Tablets', 'Wearables'],
  },
  {
    name: 'Computers & Accessories',
    slug: 'computers',
    brands: ['Dell', 'HP', 'Lenovo', 'Acer', 'ASUS', 'Logitech', 'TP-Link'],
    subcategories: ['Laptops', 'Storage Drives', 'Printers & Ink', 'Networking Devices', 'Keyboards & Mice', 'Monitors'],
  },
  {
    name: 'TV, Appliances, Electronics',
    slug: 'tv',
    brands: ['LG', 'Samsung', 'Sony', 'TCL', 'Panasonic', 'Philips'],
    subcategories: ['LED & Smart TVs', 'Home Audio', 'Kitchen Appliances', 'Air Conditioners', 'Refrigerators', 'Washing Machines'],
  },
  {
    name: "Men's Fashion",
    slug: 'mens-fashion',
    brands: ['Allen Solly', 'Van Heusen', 'Peter England', 'U.S. Polo Assn.', 'Jockey', 'Boldfit'],
    subcategories: ['Shirts & T-Shirts', 'Jeans & Trousers', 'Footwear', 'Watches', 'Bags & Wallets', 'Winterwear'],
  },
  {
    name: "Women's Fashion",
    slug: 'womens-fashion',
    brands: ['GoSriKi', 'ANNI DESIGNER', 'GRECIILOOKS', 'Enamor', 'Leriya Fashion', 'Van Heusen'],
    subcategories: ['Ethnic Wear', 'Western Wear', 'Footwear', 'Jewelry', 'Handbags', 'Innerwear'],
  },
  {
    name: 'Home, Kitchen, Pets',
    slug: 'home-kitchen',
    brands: ['Prestige', 'Pigeon', 'Milton', 'Cello', 'Solimo', 'AGARO'],
    subcategories: ['Furniture', 'Cookware & Dining', 'Home Decor', 'Pet Supplies', 'Bedding & Linen', 'Bath & Cleaning'],
  },
  {
    name: 'Beauty, Health, Grocery',
    slug: 'beauty',
    brands: ['Lakme', 'Maybelline', 'NIVEA', 'L’Oreal', 'Himalaya', 'Tata Sampann'],
    subcategories: ['Makeup', 'Skin Care', 'Health & Wellness', 'Grocery Staples', 'Snacks & Beverages', 'Personal Care'],
  },
  {
    name: 'Sports, Fitness, Bags, Luggage',
    slug: 'sports',
    brands: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Yonex', 'American Tourister'],
    subcategories: ['Cricket', 'Fitness Equipment', 'Outdoor Recreation', 'Bags & Luggage', 'Cycling', 'Team Sports'],
  },
  {
    name: "Toys, Baby Products, Kids' Fashion",
    slug: 'toys',
    brands: ['Lego', 'Mattel', 'Funskool', 'Hot Wheels', 'Mee Mee', 'Babyhug'],
    subcategories: ['Toys & Games', 'Baby Products', "Kids' Fashion", 'Remote Control Toys', 'Board Games', 'School Supplies'],
  },
  {
    name: 'Car, Motorbike, Industrial',
    slug: 'car',
    brands: ['Bosch', '3M', 'Philips', 'Mahle', 'Stanley', 'Godrej'],
    subcategories: ['Car Accessories', 'Car Care', 'Motorbike Accessories', 'Industrial Supplies', 'Tools & Hardware', 'Safety Equipment'],
  },
  {
    name: 'Books',
    slug: 'books',
    brands: ['Penguin', 'HarperCollins', 'Rupa', 'Bloomsbury', 'Arihant', 'Oxford'],
    subcategories: ['Fiction', 'Non-Fiction', 'Textbooks', 'Exam Prep', "Children's Books", 'Business Books'],
  },
  {
    name: 'Movies, Music & Video Games',
    slug: 'movies',
    brands: ['Marvel', 'Disney', 'Sony Music', 'Universal', 'Nintendo', 'PlayStation'],
    subcategories: ['Movies & TV', 'Music', 'Video Games', 'Gaming Accessories', 'Instruments', 'Collectibles'],
  },
]

const EXTRA_BRANDS = ['Boat', 'JBL', 'Canon', 'Epson', 'Whirlpool', 'IFB', 'Britannia', 'Amul', 'Nestle', 'Colgate']

const PLAN_AMOUNTS_PAISE = {
  BUYER_STANDARD: 999900,
  BUYER_LIFETIME: 4999900,
  SELLER_MONTH: 999900,
  SELLER_LIFETIME: 4999900,
}

module.exports = {
  PASSWORDS,
  ADMIN,
  BUYERS,
  SELLERS,
  LOGIN_USER_SPECS,
  LOGIN_EMAILS,
  LEGACY_DEMO_EMAILS,
  CATALOG,
  EXTRA_BRANDS,
  PLAN_AMOUNTS_PAISE,
}
