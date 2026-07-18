const { query } = require('../src/db/pool.js')

async function main() {
  try {
    const { rows } = await query('SELECT * FROM catalog.categories', [])
    console.log('Categories in database:', rows)
  } catch (err) {
    console.error('Error querying categories:', err)
  }
}

main()
