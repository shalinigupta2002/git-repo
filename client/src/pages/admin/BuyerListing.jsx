import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAdminBuyers } from '../../services/admin.service.js'

export function BuyerListing() {
  const [buyers, setBuyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Buyer ID' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'orders', label: 'Orders placed' },
      { key: 'createdAt', label: 'Created' },
    ],
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminBuyers()
      setBuyers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load buyers')
      setBuyers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Buyer Listing</h2>
          <p className="panelSub">
            {buyers.length} buyer{buyers.length === 1 ? '' : 's'} registered.
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
              <tr>
                <td colSpan={columns.length} className="tableEmpty">Loading…</td>
              </tr>
            ) : buyers.length ? (
              buyers.map((b) => (
                <tr key={b.id}>
                  <td><code style={{ fontSize: 12 }}>{b.id.slice(0, 8)}…</code></td>
                  <td>{b.companyName || '—'}</td>
                  <td>{b.email}</td>
                  <td>{b.ordersPlaced ?? 0}</td>
                  <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="tableEmpty">
                  No buyers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
