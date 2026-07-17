const { Prisma } = require('@prisma/client')

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function money(value) {
  return new Prisma.Decimal(String(value))
}

function buildProductImages(seed, name) {
  return [{
    type: 'image',
    url: `https://picsum.photos/seed/${seed}/700/700`,
    name: name || 'product-image.jpg',
    mimeType: 'image/jpeg',
  }]
}

function buildDescription(category, subcategory, brand, noun) {
  return [
    `${brand} ${noun} for ${subcategory} in ${category}.`,
    '',
    'Specifications:',
    `- Category: ${category}`,
    `- Subcategory: ${subcategory}`,
    `- Brand: ${brand}`,
    '- Origin: India',
    '- Warranty: 12 months (B2B standard)',
    '- Packaging: Export-grade carton',
    '',
    'E2E automation listing — for Playwright and manual QA flows.',
  ].join('\n')
}

module.exports = {
  slugify,
  sqlString,
  money,
  buildProductImages,
  buildDescription,
}
