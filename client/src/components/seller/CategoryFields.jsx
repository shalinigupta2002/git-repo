import { Link } from 'react-router-dom'

/**
 * Stacked category → subcategory → product type fields (premium form UX).
 */
export function CategoryFields({
  tree,
  loading,
  form,
  onCategoryChange,
  onSubcategoryChange,
  onSubsubcategoryChange,
  showRequestLink = false,
  invalidSelection = false,
  invalidMessage,
}) {
  const selectedCategoryNode = tree.find((node) => node.id === form.category) ?? null
  const subcategoryOptions = selectedCategoryNode?.children ?? []
  const selectedSubcategoryNode = subcategoryOptions.find((node) => node.id === form.subcategory) ?? null
  const subsubcategoryOptions = selectedSubcategoryNode?.children ?? []

  return (
    <div className="catFields">
      {invalidSelection ? (
        <div className="catFields__warn" role="alert">
          {invalidMessage || 'This product uses a category that is no longer available. Please choose a valid category before saving.'}
        </div>
      ) : null}

      <div className="catFields__group">
        <label className="b2bLabel" htmlFor="category">Category</label>
        <select
          id="category"
          className="b2bSelect"
          value={form.category}
          onChange={onCategoryChange}
          disabled={loading}
          required
        >
          <option value="">{loading ? 'Loading categories…' : 'Select category'}</option>
          {tree.map((node) => (
            <option key={node.id} value={node.id}>{node.label}</option>
          ))}
        </select>
        {showRequestLink ? (
          <p className="catFields__hint">
            Category missing?{' '}
            <Link to="/seller/category-request">Request a new category</Link>
            {' '}— approved categories appear here immediately.
          </p>
        ) : null}
      </div>

      <div className="catFields__group">
        <label className="b2bLabel" htmlFor="subcategory">Subcategory</label>
        <select
          id="subcategory"
          className="b2bSelect"
          value={form.subcategory}
          onChange={onSubcategoryChange}
          disabled={!form.category || subcategoryOptions.length === 0}
          required={subcategoryOptions.length > 0}
        >
          <option value="">
            {!form.category
              ? 'Select a category first'
              : subcategoryOptions.length === 0
                ? 'No subcategories for this category'
                : 'Select subcategory'}
          </option>
          {subcategoryOptions.map((node) => (
            <option key={node.id} value={node.id}>{node.label}</option>
          ))}
        </select>
      </div>

      {subsubcategoryOptions.length > 0 ? (
        <div className="catFields__group">
          <label className="b2bLabel" htmlFor="subsubcategory">
            Product type
            <span className="catFields__hintInline">— under {selectedSubcategoryNode?.label}</span>
          </label>
          <select
            id="subsubcategory"
            className="b2bSelect"
            value={form.subsubcategory}
            onChange={onSubsubcategoryChange}
          >
            <option value="">Select product type (optional)</option>
            {subsubcategoryOptions.map((node) => (
              <option key={node.id} value={node.id}>{node.label}</option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}
