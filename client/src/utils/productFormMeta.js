import { normalizeCategoryName } from './shopCategoryTree.js'

function labelsMatch(a, b) {
  return normalizeCategoryName(a) === normalizeCategoryName(b)
}

export function parseProductFormMeta(description, categoryTree = []) {
  const categoryMatch = description?.match(/Category:\s*([^.]+)\./)
  const brandMatch = description?.match(/Brand:\s*([^.]+)\./)
  const uomMatch = description?.match(/UOM:\s*([^.]+)\./)
  const deliveryMatch = description?.match(/Delivery time:\s*([^.]+)\./)

  const pathLabels = categoryMatch?.[1]?.split('>').map((part) => part.trim()).filter(Boolean) ?? []
  const categoryIds = findCategoryIdsFromLabels(pathLabels, categoryTree)

  let freeDescription = description || ''
  freeDescription = freeDescription
    .replace(/Category:\s*[^.]+\.\s*/g, '')
    .replace(/Brand:\s*[^.]+\.\s*/g, '')
    .replace(/UOM:\s*[^.]+\.\s*/g, '')
    .replace(/Delivery time:\s*[^.]+\.\s*/g, '')
    .trim()

  return {
    ...categoryIds,
    brand: brandMatch?.[1]?.trim() || '',
    uom: uomMatch?.[1]?.trim() || 'MT',
    delivery: deliveryMatch?.[1]?.trim() || '',
    description: freeDescription,
  }
}

function findCategoryIdsFromLabels(pathLabels, categoryTree = []) {
  if (!pathLabels.length) {
    return { category: '', subcategory: '', subsubcategory: '' }
  }

  const top = categoryTree.find((node) => labelsMatch(node.label, pathLabels[0]))
  if (!top) {
    return { category: '', subcategory: '', subsubcategory: '' }
  }

  let subcategory = ''
  let subsubcategory = ''

  if (pathLabels[1] && top.children?.length) {
    const subNode = top.children.find((node) => labelsMatch(node.label, pathLabels[1]))
    if (subNode) {
      subcategory = subNode.id
      if (pathLabels[2] && subNode.children?.length) {
        const subsubNode = subNode.children.find((node) => labelsMatch(node.label, pathLabels[2]))
        if (subsubNode) subsubcategory = subsubNode.id
      }
    }
  }

  return { category: top.id, subcategory, subsubcategory }
}

export function buildProductDescription(form, selectedCategoryNode, subcategoryOptions, subsubcategoryOptions) {
  const categoryLabel = selectedCategoryNode?.label ?? form.category
  const subcatLabel = subcategoryOptions.find((node) => node.id === form.subcategory)?.label ?? form.subcategory
  const subsubcatLabel = subsubcategoryOptions.find((node) => node.id === form.subsubcategory)?.label ?? form.subsubcategory
  const categoryNote = categoryLabel
    ? `Category: ${categoryLabel}${subcatLabel ? ` > ${subcatLabel}` : ''}${subsubcatLabel ? ` > ${subsubcatLabel}` : ''}. `
    : ''
  const brandNote = form.brand.trim() ? `Brand: ${form.brand.trim()}. ` : ''
  const uomNote = form.uom ? `UOM: ${form.uom}. ` : ''
  const deliveryNote = form.delivery ? `Delivery time: ${form.delivery}. ` : ''
  return (categoryNote + brandNote + uomNote + deliveryNote + (form.description || '')).trim() || null
}
