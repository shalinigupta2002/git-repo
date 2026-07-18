const ctrl = require('../src/controllers/shopCategoryController.js')

async function main() {
  const req = {}
  const res = {
    headers: {},
    set(name, value) {
      this.headers[name] = value
    },
    json(data) {
      console.log('Controller Response JSON:', JSON.stringify(data, null, 2))
    }
  }

  try {
    await ctrl.listShopCategories(req, res, (err) => {
      if (err) console.error('Next error:', err)
    })
  } catch (err) {
    console.error('Execution error:', err)
  }
}

main()
