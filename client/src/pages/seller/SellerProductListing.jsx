import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { deleteProduct, listProducts } from '../../services/product.service.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectHasSellerSubscription } from '../../store/slices/subscriptionSlice.js'
import { resolveUploadUrl } from '../../utils/uploadUrl.js'

function parseProductMeta(description) {
  if (!description) return { category: null, brand: null }
  const categoryMatch = description.match(/Category:\s*([^.]+)\./)
  const brandMatch = description.match(/Brand:\s*([^.]+)\./)
  return {
    category: categoryMatch?.[1]?.trim() || null,
    brand: brandMatch?.[1]?.trim() || null,
  }
}

function parseProductImages(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function getProductImageUrl(product) {
  const images = parseProductImages(product.images)
  const first = images.find((item) => item?.url)?.url
  return first ? resolveUploadUrl(first) : null
}

function enrichProduct(product) {
  const meta = parseProductMeta(product.description)
  return {
    ...product,
    category: meta.category,
    brand: meta.brand,
    imageUrl: getProductImageUrl(product),
  }
}

function formatPrice(price, currency = 'INR') {
  const num = Number(price)
  if (!Number.isFinite(num)) return String(price ?? '')
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(2)}`
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatStock(product) {
  if (!product.trackInventory) return '—'
  const qty = product.stockQty ?? 0
  const reserved = product.reservedQty ?? 0
  if (reserved > 0) return `${qty} (${qty - reserved} avail.)`
  return String(qty)
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
    </svg>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[48, 160, 100, 70, 60, 50, 70, 80, 70].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{ height: 12, width: w, borderRadius: 6, background: '#f1f5f9' }} />
        </td>
      ))}
    </tr>
  )
}

function RemoveConfirmDialog({ product, open, removing, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open || !product) return null

  return (
    <div
      className="featureAlertOverlay"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="featureAlert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="removeProductTitle"
        aria-describedby="removeProductMessage"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="featureAlert__icon" aria-hidden>
          <TrashIcon />
        </div>
        <h2 id="removeProductTitle" className="featureAlert__title">
          Remove product?
        </h2>
        <p id="removeProductMessage" className="featureAlert__message">
          Are you sure you want to remove <strong>{product.name}</strong> from your catalog?
          This action cannot be undone.
        </p>
        <div className="featureAlert__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={removing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ background: '#dc2626', borderColor: '#dc2626' }}
            onClick={onConfirm}
            disabled={removing}
          >
            {removing ? 'Removing…' : 'Remove product'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false)
  const fallback = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23f1f5f9%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2212%22%3ENo image%3C/text%3E%3C/svg%3E'

  return (
    <img
      src={!src || failed ? fallback : src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        objectFit: 'cover',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        flexShrink: 0,
      }}
    />
  )
}

function ProductCard({ product, onRemove, removing }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8ecf1',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <ProductImage src={product.imageUrl} alt={product.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 3 }}>{product.name}</div>
              <code style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{product.sku}</code>
            </div>
            <span className={`b2bBadge ${product.isActive ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
              {product.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px', fontSize: 12 }}>
        <div><span style={{ color: '#94a3b8' }}>Category</span><div style={{ color: '#334155', fontWeight: 600, marginTop: 2 }}>{product.category || '—'}</div></div>
        <div><span style={{ color: '#94a3b8' }}>Brand</span><div style={{ color: '#334155', fontWeight: 600, marginTop: 2 }}>{product.brand || '—'}</div></div>
        <div><span style={{ color: '#94a3b8' }}>Price</span><div style={{ color: '#0f172a', fontWeight: 800, marginTop: 2 }}>{formatPrice(product.price, product.currency)}</div></div>
        <div><span style={{ color: '#94a3b8' }}>Stock</span><div style={{ color: '#334155', fontWeight: 600, marginTop: 2 }}>{formatStock(product)}</div></div>
        <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#94a3b8' }}>Date added</span><div style={{ color: '#334155', fontWeight: 600, marginTop: 2 }}>{formatDate(product.createdAt)}</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
        <Link
          to={`/seller/products/${product.id}/edit`}
          className="btn btn--ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px', color: '#2563eb', borderColor: '#bfdbfe' }}
        >
          <EditIcon /> Edit
        </Link>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px', color: '#dc2626', borderColor: '#fecaca' }}
          onClick={() => onRemove(product)}
          disabled={removing}
        >
          <TrashIcon /> {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: '#fff',
      border: '1px solid #e8ecf1',
      borderRadius: 12,
      padding: '16px 0',
      alignSelf: 'flex-start',
      boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px 12px',
        borderBottom: '1px solid #f1f5f9',
        marginBottom: 4,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" aria-hidden>
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '0.01em' }}>Category filter</span>
      </div>

      <div style={{ padding: '4px 0' }}>
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '7px 16px',
            border: 'none',
            background: selected === null ? '#eff6ff' : 'transparent',
            color: selected === null ? '#2563eb' : '#374151',
            fontWeight: selected === null ? 700 : 500,
            fontSize: 13,
            cursor: 'pointer',
            borderLeft: selected === null ? '3px solid #2563eb' : '3px solid transparent',
          }}
        >
          All products
        </button>

        {categories.length ? categories.map((item) => {
          const isActive = selected === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(isActive ? null : item)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 16px',
                border: 'none',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#4b5563',
                fontWeight: isActive ? 700 : 400,
                fontSize: 13,
                cursor: 'pointer',
                borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                lineHeight: 1.4,
              }}
            >
              {item}
            </button>
          )
        }) : (
          <p style={{ margin: '10px 16px', fontSize: 12, color: '#94a3b8' }}>Categories appear after you list products.</p>
        )}
      </div>
    </aside>
  )
}

export function SellerProductListing() {
  const hasSub = useAppSelector(selectHasSellerSubscription)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [confirmProduct, setConfirmProduct] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 680)
  const [selectedCategory, setSelectedCategory] = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const load = useCallback(async (searchQuery = '') => {
    setLoading(true)
    setError('')
    try {
      const params = { mine: true, limit: 100, includeInactive: false }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      const data = await listProducts(params)
      const rows = Array.isArray(data?.products) ? data.products.map(enrichProduct) : []
      setProducts(rows)
    } catch (e) {
      setError(e.message || 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timer = setTimeout(() => load(search), 320)
    return () => clearTimeout(timer)
  }, [search, load])

  const categories = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [products])

  const filtered = useMemo(() => {
    if (!selectedCategory) return products
    return products.filter((p) => p.category === selectedCategory)
  }, [products, selectedCategory])

  function requestRemove(product) {
    setConfirmProduct(product)
  }

  async function confirmRemove() {
    if (!confirmProduct) return
    setRemovingId(confirmProduct.id)
    try {
      const result = await deleteProduct(confirmProduct.id)
      toast.success(
        result?.archived
          ? 'Product removed from your catalog (kept for order history)'
          : 'Product removed',
      )
      setConfirmProduct(null)
      setProducts((prev) => prev.filter((p) => p.id !== confirmProduct.id))
    } catch (e) {
      toast.error(e.message || 'Failed to remove product')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <RemoveConfirmDialog
        product={confirmProduct}
        open={Boolean(confirmProduct)}
        removing={Boolean(removingId)}
        onCancel={() => !removingId && setConfirmProduct(null)}
        onConfirm={confirmRemove}
      />

      <div style={{
        background: 'linear-gradient(135deg,#ecfdf5 0%,#fff 60%)',
        borderBottom: '1px solid #e8ecf1',
        padding: '20px 24px 16px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Product management
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Manage your catalog — only your listed products are shown here.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btnOutline"
              onClick={() => load(search)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshIcon /> {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link
              to="/seller/add-product"
              className="btn btn--primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <PlusIcon /> Add product
            </Link>
          </div>
        </div>

        {!loading && products.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Listed', value: filtered.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
              { label: 'Active', value: filtered.filter((p) => p.isActive).length, color: '#16a34a', bg: '#ecfdf5', border: '#a7f3d0' },
              { label: 'Inactive', value: filtered.filter((p) => !p.isActive).length, color: '#d97706', bg: '#fff7ed', border: '#fed7aa' },
            ].map((s) => (
              <div key={s.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: s.color,
              }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{s.value}</span>
                <span style={{ fontWeight: 500, color: '#64748b' }}>{s.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!hasSub ? (
        <div style={{
          margin: '16px 24px 0',
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
            <strong>Free tier:</strong> You can list products for free. Orders and transactions require a subscription.
          </p>
          <Link to="/" className="btn btn--primary" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}>
            Subscribe
          </Link>
        </div>
      ) : null}

      <div style={{ padding: '16px 24px 32px', flex: 1, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {!isMobile && (
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <section style={{
            background: '#fff',
            border: '1px solid #e8ecf1',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
          }}>
            <div style={{
              padding: '16px 18px',
              borderBottom: '1px solid #e8ecf1',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>My listed products</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  {loading
                    ? 'Loading your catalog…'
                    : `${filtered.length} product${filtered.length === 1 ? '' : 's'} shown`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {isMobile && (
                  <select
                    className="b2bSelect"
                    value={selectedCategory ?? ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    style={{ minWidth: 160 }}
                  >
                    <option value="">All categories</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                )}

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  background: '#f8fafc',
                  minWidth: 220,
                }}>
                  <SearchIcon />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or SKU…"
                    aria-label="Search products"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: 13,
                      width: '100%',
                      color: '#0f172a',
                    }}
                  />
                </label>
              </div>
            </div>

            {error ? <div className="errorBox" style={{ margin: 16 }}>{error}</div> : null}

            {selectedCategory ? (
              <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Filtered by:</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#2563eb', fontWeight: 700, fontSize: 14 }}
                    aria-label="Clear category filter"
                  >
                    ×
                  </button>
                </span>
              </div>
            ) : null}

            {isMobile ? (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ height: 180, borderRadius: 12, background: '#f1f5f9' }} />
                    ))
                  : filtered.length
                    ? filtered.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onRemove={requestRemove}
                          removing={removingId === product.id}
                        />
                      ))
                    : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                        padding: '48px 24px',
                        textAlign: 'center',
                        border: '2px dashed #e2e8f0',
                        borderRadius: 14,
                        background: '#f8fafc',
                      }}>
                        <span style={{ fontSize: 40 }}>📋</span>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                          {search || selectedCategory ? 'No matching products' : 'No products yet'}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                          {search || selectedCategory
                            ? 'Try adjusting your search or category filter.'
                            : 'Start by adding your first product to your catalog.'}
                        </p>
                        {!search && !selectedCategory && (
                          <Link to="/seller/add-product" className="btn btn--primary">Add first product</Link>
                        )}
                      </div>
                    )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e8ecf1' }}>
                      {['Image', 'Product', 'Category', 'Brand', 'Price', 'Stock', 'Status', 'Date added', ''].map((h, i) => (
                        <th key={h || 'actions'} style={{
                          padding: '11px 16px',
                          textAlign: i === 8 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : filtered.length
                        ? filtered.map((product) => (
                            <tr
                              key={product.id}
                              style={{ borderBottom: '1px solid #f1f5f9' }}
                            >
                              <td style={{ padding: '13px 16px' }}>
                                <ProductImage src={product.imageUrl} alt={product.name} />
                              </td>
                              <td style={{ padding: '13px 16px', maxWidth: 220 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>{product.name}</div>
                                <code style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}>
                                  {product.sku}
                                </code>
                              </td>
                              <td style={{ padding: '13px 16px', maxWidth: 180 }}>
                                {product.category ? (
                                  <span style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#6366f1',
                                    background: '#eef2ff',
                                    border: '1px solid #c7d2fe',
                                    borderRadius: 6,
                                    padding: '3px 8px',
                                    display: 'inline-block',
                                    lineHeight: 1.35,
                                  }}>
                                    {product.category}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '13px 16px' }}>
                                {product.brand ? (
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{product.brand}</span>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                  {formatPrice(product.price, product.currency)}
                                </span>
                              </td>
                              <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                                  {formatStock(product)}
                                </span>
                              </td>
                              <td style={{ padding: '13px 16px' }}>
                                <span className={`b2bBadge ${product.isActive ? 'b2bBadge--green' : 'b2bBadge--amber'}`}>
                                  {product.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', fontSize: 13, color: '#64748b' }}>
                                {formatDate(product.createdAt)}
                              </td>
                              <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  <Link
                                    to={`/seller/products/${product.id}/edit`}
                                    className="btn btn--ghost"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      fontSize: 12,
                                      padding: '6px 12px',
                                      color: '#2563eb',
                                      borderColor: '#bfdbfe',
                                    }}
                                  >
                                    <EditIcon />
                                    Edit
                                  </Link>
                                  <button
                                    type="button"
                                    className="btn btn--ghost"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      fontSize: 12,
                                      padding: '6px 12px',
                                      color: removingId === product.id ? '#94a3b8' : '#dc2626',
                                      borderColor: '#fecaca',
                                    }}
                                    onClick={() => requestRemove(product)}
                                    disabled={removingId === product.id}
                                  >
                                    <TrashIcon />
                                    {removingId === product.id ? 'Removing…' : 'Remove'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        : (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '56px 24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 40 }}>📋</span>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                                  {search || selectedCategory ? 'No matching products' : 'No products yet'}
                                </h3>
                                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                                  {search || selectedCategory
                                    ? 'Try adjusting your search or category filter.'
                                    : 'Your catalog is empty. Add your first product to start selling.'}
                                </p>
                                {search || selectedCategory ? (
                                  <button
                                    type="button"
                                    className="btnOutline"
                                    onClick={() => { setSearch(''); setSelectedCategory(null) }}
                                    style={{ marginTop: 4 }}
                                  >
                                    Clear filters
                                  </button>
                                ) : (
                                  <Link to="/seller/add-product" className="btn btn--primary" style={{ marginTop: 4 }}>
                                    Add first product
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
