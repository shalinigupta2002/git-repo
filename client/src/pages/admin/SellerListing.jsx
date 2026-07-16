import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAdminSellers } from '../../services/admin.service.js'

export function SellerListing() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Seller ID' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'products', label: 'Products' },
      { key: 'orders', label: 'Orders' },
      { key: 'createdAt', label: 'Created' },
    ],
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminSellers()
      setSellers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load sellers')
      setSellers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Seller Listing</h2>
          <p className="panelSub">
            {sellers.length} seller{sellers.length === 1 ? '' : 's'} registered.
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="tableEmpty">Loading…</td></tr>
            ) : sellers.length ? (
              sellers.map((s) => (
                <tr key={s.id}>
                  <td><code style={{ fontSize: 12 }}>{s.id.slice(0, 8)}…</code></td>
                  <td>{s.companyName || '—'}</td>
                  <td>{s.email}</td>
                  <td>{s.productsCount ?? 0}</td>
                  <td>{s.ordersCount ?? 0}</td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={columns.length} className="tableEmpty">No sellers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
