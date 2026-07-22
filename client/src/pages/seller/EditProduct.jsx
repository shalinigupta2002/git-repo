import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SellerWorkflowChrome } from '../../layouts/SellerWorkflowChrome.jsx'
import { getProduct, updateProduct } from '../../services/product.service.js'
import { useShopCategoryTree, isCategorySelectionInvalid } from '../../hooks/useShopCategoryTree.js'
import { CategoryFields } from '../../components/seller/CategoryFields.jsx'
import { buildProductDescription, parseProductFormMeta } from '../../utils/productFormMeta.js'
import { PRODUCT_UOM_OPTIONS } from '../../constants/productUom.js'
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
  description: '',
  isActive: true,
}

function preventNumberWheel(event) {
  event.currentTarget.blur()
}

function preventNumberArrowKeys(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
  }
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
          uom: product.uom || meta.uom || 'MT',
          price: product.price != null ? String(product.price) : '',
          currency: product.currency || 'INR',
          delivery: meta.delivery,
          availableStocks: product.trackInventory ? String(product.stockQty ?? 0) : '',
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

  const categoryInvalid = useMemo(
    () => isCategorySelectionInvalid(categoryTree, form),
    [categoryTree, form],
  )

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (categoryInvalid) {
      setError('This product uses a deleted category. Please select a valid category before saving.')
      return
    }
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
        uom: form.uom,
        price: priceNum,
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

  if (error && !form.name) {
    return (
      <SellerWorkflowChrome
        fullWidth
        showStepper={false}
        title="Edit product"
        subtitle="Update pricing, stock, and listing details."
        activeStepId="add"
        prevTo="/seller/products"
        prevLabel="Back to listings"
      >
        <div className="anpPage">
          <div className="errorBox">{error}</div>
        </div>
      </SellerWorkflowChrome>
    )
  }

  return (
    <SellerWorkflowChrome
      fullWidth
      showStepper={false}
      title="Edit product"
      subtitle="Update pricing, stock, and listing details. Changes appear on the product page immediately."
      activeStepId="add"
      prevTo="/seller/products"
      prevLabel="Back to listings"
      nextTo="/seller/products"
      nextLabel="View my listings"
    >
      <div className="anpPage">
        <div className="b2bCard anpCard">
          <div className="b2bCard__hd">
            <div>
              <h2 className="b2bCard__title">Product details</h2>
              <p className="panelSub" style={{ margin: '4px 0 0' }}>
                Update commercial terms and listing metadata.
              </p>
            </div>
            <span className={`b2bBadge ${form.isActive ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
              {form.isActive ? 'Active listing' : 'Inactive listing'}
            </span>
          </div>
          <div className="b2bCard__bd">
            <form className="b2bForm anpForm" onSubmit={onSubmit}>
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

              <CategoryFields
                tree={categoryTree}
                loading={categoriesLoading}
                form={form}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={handleSubcategoryChange}
                onSubsubcategoryChange={(e) => updateField('subsubcategory', e.target.value)}
                invalidSelection={categoryInvalid}
              />

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="brand">Brand</label>
                  <input id="brand" className="b2bInput" value={form.brand} onChange={(e) => updateField('brand', e.target.value)} />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="uom">Unit of measure</label>
                  <select id="uom" className="b2bSelect" value={form.uom} onChange={(e) => updateField('uom', e.target.value)}>
                    {PRODUCT_UOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="price">Price per unit (INR)</label>
                  <input
                    id="price"
                    type="number"
                    className="b2bInput b2bInput--number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    onWheel={preventNumberWheel}
                    onKeyDown={preventNumberArrowKeys}
                    required
                  />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="currency">Currency</label>
                  <select id="currency" className="b2bSelect" value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="availableStocks">Available stocks</label>
                  <input
                    id="availableStocks"
                    type="number"
                    className="b2bInput b2bInput--number"
                    min={0}
                    step={1}
                    value={form.availableStocks}
                    onChange={(e) => updateField('availableStocks', e.target.value)}
                    onWheel={preventNumberWheel}
                    onKeyDown={preventNumberArrowKeys}
                  />
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

              <div className="anpFormActions">
                <Link to="/seller/products" className="btnOutline">Cancel</Link>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SellerWorkflowChrome>
  )
}
