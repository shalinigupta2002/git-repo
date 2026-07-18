const { fetchActiveCategoryTree } = require('../src/services/shopCategoryDbService.js')

async function main() {
  try {
    const tree = await fetchActiveCategoryTree()
    console.log('Built category tree length:', tree.length)
    console.log('Tree nodes:', JSON.stringify(tree, null, 2))
  } catch (err) {
    console.error('Error building tree:', err)
  }
}

main()
