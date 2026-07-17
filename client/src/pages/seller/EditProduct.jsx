import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getProduct, updateProduct } from '../../services/product.service.js'
import { useShopCategoryTree } from '../../hooks/useShopCategoryTree.js'
import { buildProductDescription, parseProductFormMeta } from '../../utils/productFormMeta.js'
import { PageLoader } from '../../components/ui/PageLoader.jsx'

const INITIAL = {
  sku: '',
  name: '',
  category: '',
  subcategory: '',
  subsubcategory: '',
  brand: '',
  uom: 'MT',
  price: '',
  currency: 'INR',
  delivery: '',
  availableStocks: '',
  moq: '1',
  description: '',
  isActive: true,
}

export function EditProduct() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { tree: categoryTree, loading: categoriesLoading } = useShopCategoryTree()
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (categoriesLoading) return undefined

    let alive = true
    setLoading(true)
    setError('')

    getProduct(productId)
      .then((data) => {
        if (!alive) return
        const product = data?.product
        if (!product) {
          setError('Product not found')
          return
        }
        const meta = parseProductFormMeta(product.description, categoryTree)
        setForm({
          sku: product.sku || '',
          name: product.name || '',
          category: meta.category,
          subcategory: meta.subcategory,
          subsubcategory: meta.subsubcategory,
          brand: meta.brand,
          uom: meta.uom || 'MT',
          price: product.price != null ? String(product.price) : '',
          currency: product.currency || 'INR',
          delivery: meta.delivery,
          availableStocks: product.trackInventory ? String(product.stockQty ?? 0) : '',
          moq: product.moq != null ? String(product.moq) : '1',
          description: meta.description,
          isActive: product.isActive !== false,
        })
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Failed to load product')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [productId, categoryTree, categoriesLoading])

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleCategoryChange(e) {
    setForm((prev) => ({ ...prev, category: e.target.value, subcategory: '', subsubcategory: '' }))
  }

  function handleSubcategoryChange(e) {
    setForm((prev) => ({ ...prev, subcategory: e.target.value, subsubcategory: '' }))
  }

  const selectedCategoryNode = useMemo(
    () => categoryTree.find((node) => node.id === form.category) ?? null,
    [categoryTree, form.category],
  )

  const subcategoryOptions = useMemo(
    () => selectedCategoryNode?.children ?? [],
    [selectedCategoryNode],
  )

  const selectedSubcategoryNode = useMemo(
    () => subcategoryOptions.find((node) => node.id === form.subcategory) ?? null,
    [subcategoryOptions, form.subcategory],
  )

  const subsubcategoryOptions = useMemo(
    () => selectedSubcategoryNode?.children ?? [],
    [selectedSubcategoryNode],
  )

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.sku.trim() || !form.name.trim()) {
      setError('SKU and product name are required')
      return
    }

    const priceNum = Number(form.price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Price must be a positive number')
      return
    }

    const stockNum = form.availableStocks === '' ? 0 : Number(form.availableStocks)
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError('Available stocks must be a whole number of 0 or more')
      return
    }

    const moqNum = form.moq === '' ? 1 : Number(form.moq)
    if (!Number.isInteger(moqNum) || moqNum < 1) {
      setError('MOQ must be a whole number of 1 or more')
      return
    }

    const description = buildProductDescription(
      form,
      selectedCategoryNode,
      subcategoryOptions,
      subsubcategoryOptions,
    )

    setSubmitting(true)
    try {
      await updateProduct(productId, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description,
        price: priceNum,
        moq: moqNum,
        currency: form.currency || 'INR',
        isActive: form.isActive,
        trackInventory: stockNum > 0,
        stockQty: stockNum,
      })
      toast.success('Product updated successfully')
      navigate('/seller/products')
    } catch (err) {
      setError(err.message || 'Failed to update product')
      toast.error(err.message || 'Failed to update product')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoader label="Loading product" />
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Edit product</h2>
          <p className="panelSub">Update pricing, stock, and listing details. Changes appear on the product page immediately.</p>
        </div>
        <Link to="/seller/products" className="btnOutline">Back to listings</Link>
      </div>

      {error && !form.name ? (
        <div className="errorBox" style={{ marginTop: 12 }}>{error}</div>
      ) : (
        <div className="b2bCard" style={{ marginTop: 12 }}>
          <div className="b2bCard__bd">
            <form className="b2bForm" onSubmit={onSubmit}>
              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="sku">SKU / Item code</label>
                  <input id="sku" className="b2bInput" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} required />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="name">Product name</label>
                  <input id="name" className="b2bInput" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="category">Category</label>
                  <select id="category" className="b2bSelect" value={form.category} onChange={handleCategoryChange}>
                    <option value="">Select category</option>
                    {categoryTree.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="subcategory">Subcategory</label>
                  <select id="subcategory" className="b2bSelect" value={form.subcategory} onChange={handleSubcategoryChange} disabled={subcategoryOptions.length === 0}>
                    <option value="">{subcategoryOptions.length === 0 ? 'Select a category first' : 'Select subcategory'}</option>
                    {subcategoryOptions.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {subsubcategoryOptions.length > 0 ? (
                <div>
                  <label className="b2bLabel" htmlFor="subsubcategory">Product type</label>
                  <select id="subsubcategory" className="b2bSelect" value={form.subsubcategory} onChange={(e) => updateField('subsubcategory', e.target.value)}>
                    <option value="">Select product type</option>
                    {subsubcategoryOptions.map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="brand">Brand</label>
                  <input id="brand" className="b2bInput" value={form.brand} onChange={(e) => updateField('brand', e.target.value)} />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="uom">Unit of measure</label>
                  <select id="uom" className="b2bSelect" value={form.uom} onChange={(e) => updateField('uom', e.target.value)}>
                    <option value="MT">Metric ton (MT)</option>
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="M">Meters (M)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="L">Litres (L)</option>
                    <option value="BOX">Box (BOX)</option>
                    <option value="SET">Set (SET)</option>
                  </select>
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="price">Price per unit (INR)</label>
                  <input id="price" type="number" className="b2bInput" min={0} step="0.01" value={form.price} onChange={(e) => updateField('price', e.target.value)} required />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="moq">Minimum order quantity (MOQ)</label>
                  <input id="moq" type="number" className="b2bInput" min={1} step={1} value={form.moq} onChange={(e) => updateField('moq', e.target.value)} required />
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="availableStocks">Available stocks</label>
                  <input id="availableStocks" type="number" className="b2bInput" min={0} step={1} value={form.availableStocks} onChange={(e) => updateField('availableStocks', e.target.value)} />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="delivery">Delivery time</label>
                  <input id="delivery" className="b2bInput" value={form.delivery} onChange={(e) => updateField('delivery', e.target.value)} />
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="status">Listing status</label>
                  <select id="status" className="b2bSelect" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => updateField('isActive', e.target.value === 'active')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div />
              </div>

              <div>
                <label className="b2bLabel" htmlFor="desc">Description &amp; specs</label>
                <textarea id="desc" className="b2bTextarea" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
              </div>

              {error ? <div className="errorBox">{error}</div> : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
                <Link to="/seller/products" className="btnOutline">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
