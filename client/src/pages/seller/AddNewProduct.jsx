import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SellerWorkflowChrome } from '../../layouts/SellerWorkflowChrome.jsx'
import { createProduct } from '../../services/product.service.js'
import { useShopCategoryTree } from '../../hooks/useShopCategoryTree.js'
import { CategoryFields } from '../../components/seller/CategoryFields.jsx'

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
}

const IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt'

function FileUploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

export function AddNewProduct() {
  const navigate = useNavigate()
  const { tree: categoryTree, loading: categoriesLoading } = useShopCategoryTree()
  const [form, setForm] = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [docFiles, setDocFiles] = useState([])
  const imgInputRef = useRef(null)
  const docInputRef = useRef(null)

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setImagePreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  function handleImageChange(e) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    setImageFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...picked.filter((f) => !names.has(f.name + f.size))]
    })
    e.target.value = ''
  }

  function removeImage(idx) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleDocChange(e) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    setDocFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...picked.filter((f) => !names.has(f.name + f.size))]
    })
    e.target.value = ''
  }

  function removeDoc(idx) {
    setDocFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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
    () => categoryTree.find((n) => n.id === form.category) ?? null,
    [categoryTree, form.category],
  )

  const subcategoryOptions = useMemo(
    () => selectedCategoryNode?.children ?? [],
    [selectedCategoryNode],
  )

  const selectedSubcategoryNode = useMemo(
    () => subcategoryOptions.find((n) => n.id === form.subcategory) ?? null,
    [subcategoryOptions, form.subcategory],
  )

  const subsubcategoryOptions = useMemo(
    () => selectedSubcategoryNode?.children ?? [],
    [selectedSubcategoryNode],
  )

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.sku.trim()) {
      setError('SKU is required')
      return
    }
    if (!form.name.trim()) {
      setError('Product name is required')
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

    const categoryLabel = selectedCategoryNode?.label ?? form.category
    const subcatLabel = subcategoryOptions.find((n) => n.id === form.subcategory)?.label ?? form.subcategory
    const subsubcatLabel = subsubcategoryOptions.find((n) => n.id === form.subsubcategory)?.label ?? form.subsubcategory
    const categoryNote = categoryLabel
      ? `Category: ${categoryLabel}${subcatLabel ? ` > ${subcatLabel}` : ''}${subsubcatLabel ? ` > ${subsubcatLabel}` : ''}. `
      : ''
    const brandNote = form.brand.trim() ? `Brand: ${form.brand.trim()}. ` : ''
    const uomNote = form.uom ? `UOM: ${form.uom}. ` : ''
    const deliveryNote = form.delivery ? `Delivery time: ${form.delivery}. ` : ''
    const description =
      (categoryNote + brandNote + uomNote + deliveryNote + (form.description || '')).trim() || null

    setSubmitting(true)
    try {
      await createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description,
        price: priceNum,
        currency: form.currency || 'INR',
        isActive: true,
        trackInventory: stockNum > 0,
        stockQty: stockNum,
      }, imageFiles)
      toast.success('Product published — now live in the catalog')
      navigate('/seller/products')
    } catch (err) {
      setError(err.message || 'Failed to create product')
      toast.error(err.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setForm(INITIAL)
    setImageFiles([])
    setDocFiles([])
  }

  return (
    <SellerWorkflowChrome
      fullWidth
      showStepper={false}
      title="Add new product"
      subtitle="Create a wholesale listing with SKU, category, and commercial terms. Publishing makes it immediately visible to buyers — no admin approval required."
      activeStepId="add"
      prevTo="/seller/dashboard"
      prevLabel="Back to dashboard"
      nextTo="/seller/products"
      nextLabel="View my listings"
    >
      <div className="anpPage">
        <div className="b2bCard anpCard">
          <div className="b2bCard__hd">
            <div>
              <h2 className="b2bCard__title">Product details</h2>
              <p className="panelSub" style={{ margin: '4px 0 0' }}>
                Required fields mirror a typical B2B catalog.
              </p>
            </div>
            <span className="b2bBadge b2bBadge--green">Live on publish</span>
          </div>
          <div className="b2bCard__bd">
            <form className="b2bForm anpForm" onSubmit={onSubmit}>
              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="sku">SKU / Item code</label>
                  <input
                    id="sku"
                    className="b2bInput"
                    placeholder="e.g. IND-STL-12MM-001"
                    value={form.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="name">Product name</label>
                  <input
                    id="name"
                    className="b2bInput"
                    placeholder="e.g. Cold rolled steel sheet 12mm"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <CategoryFields
                tree={categoryTree}
                loading={categoriesLoading}
                form={form}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={handleSubcategoryChange}
                onSubsubcategoryChange={(e) => updateField('subsubcategory', e.target.value)}
                showRequestLink
              />

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="brand">Brand</label>
                  <input
                    id="brand"
                    className="b2bInput"
                    placeholder="e.g. Samsung, Tata Steel, Pidilite"
                    value={form.brand}
                    onChange={(e) => updateField('brand', e.target.value)}
                  />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="uom">Unit of measure</label>
                  <select
                    id="uom"
                    className="b2bSelect"
                    value={form.uom}
                    onChange={(e) => updateField('uom', e.target.value)}
                  >
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
                  <input
                    id="price"
                    type="number"
                    className="b2bInput"
                    placeholder="e.g. 58500"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    className="b2bSelect"
                    value={form.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="b2bFormRow2">
                <div>
                  <label className="b2bLabel" htmlFor="delivery">Delivery time</label>
                  <input
                    id="delivery"
                    className="b2bInput"
                    placeholder="e.g. 14–21 business days"
                    value={form.delivery}
                    onChange={(e) => updateField('delivery', e.target.value)}
                  />
                </div>
                <div>
                  <label className="b2bLabel" htmlFor="availableStocks">Available stocks</label>
                  <input
                    id="availableStocks"
                    type="number"
                    className="b2bInput"
                    placeholder="e.g. 500"
                    min={0}
                    step={1}
                    value={form.availableStocks}
                    onChange={(e) => updateField('availableStocks', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="b2bLabel" htmlFor="desc">Description &amp; specs</label>
                <textarea
                  id="desc"
                  className="b2bTextarea"
                  placeholder="Dimensions, grade, certifications, incoterms notes…"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>

              {/* Product images & documents */}
              <div className="anpUploadRow">
              <div>
                <label className="b2bLabel">Product images</label>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept={IMG_ACCEPT}
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                <div
                  className="anpUploadZone"
                  role="button"
                  tabIndex={0}
                  onClick={() => imgInputRef.current?.click()}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && imgInputRef.current?.click()}
                  aria-label="Upload product images"
                >
                  <FileUploadIcon />
                  <span className="anpUploadZone__text">
                    Click to add images <span className="anpUploadZone__hint">JPG, PNG, WEBP, GIF, SVG</span>
                  </span>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="anpImageGrid">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="anpThumb">
                        <img src={src} alt={imageFiles[i]?.name ?? ''} className="anpThumb__img" />
                        <button
                          type="button"
                          className="anpThumb__remove"
                          onClick={() => removeImage(i)}
                          aria-label={`Remove image ${imageFiles[i]?.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="b2bLabel">Product documents</label>
                <input
                  ref={docInputRef}
                  type="file"
                  accept={DOC_ACCEPT}
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleDocChange}
                />
                <div
                  className="anpUploadZone"
                  role="button"
                  tabIndex={0}
                  onClick={() => docInputRef.current?.click()}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && docInputRef.current?.click()}
                  aria-label="Upload product documents"
                >
                  <FileUploadIcon />
                  <span className="anpUploadZone__text">
                    Click to add documents <span className="anpUploadZone__hint">PDF, Word, Excel, CSV, PowerPoint</span>
                  </span>
                </div>
                {docFiles.length > 0 && (
                  <ul className="anpDocList">
                    {docFiles.map((f, i) => (
                      <li key={i} className="anpDocItem">
                        <span className="anpDocItem__icon"><DocIcon /></span>
                        <span className="anpDocItem__name" title={f.name}>{f.name}</span>
                        <span className="anpDocItem__size">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          className="anpDocItem__remove"
                          onClick={() => removeDoc(i)}
                          aria-label={`Remove ${f.name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              </div>

              {error ? <div className="errorBox">{error}</div> : null}

              <div className="anpFormActions">
                <button
                  type="button"
                  className="btnOutline"
                  onClick={handleReset}
                  disabled={submitting}
                >
                  Reset
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Publishing…' : 'Publish listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SellerWorkflowChrome>
  )
}
