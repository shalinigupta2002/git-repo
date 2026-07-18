const { buildTree } = require('../services/shopCategoryDbService.js')

describe('shopCategoryDbService.buildTree', () => {
  it('builds nested tree sorted alphabetically', () => {
    const rows = [
      { id: 1, name: 'Electronics', slug: 'electronics', parent_id: null },
      { id: 2, name: 'Cables', slug: 'cables', parent_id: 1 },
      { id: 3, name: 'Apparel', slug: 'apparel', parent_id: null },
    ]

    const tree = buildTree(rows)
    expect(tree.map((n) => n.label)).toEqual(['Apparel', 'Electronics'])
    expect(tree[1].children.map((n) => n.label)).toEqual(['Cables'])
    expect(tree[1].children[0].id).toBe('cables')
  })
})
