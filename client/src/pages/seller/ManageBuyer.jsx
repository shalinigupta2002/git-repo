import { useEffect, useState } from 'react'
import { getPortalUserId } from '../../utils/sellerDisplay.js'
import { SellerWorkflowChrome } from '../../layouts/SellerWorkflowChrome.jsx'
import { fetchConfirmedBuyers } from '../../services/quoteRequest.service.js'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function ManageBuyer() {
  const [buyers, setBuyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    fetchConfirmedBuyers()
      .then((data) => {
        if (!alive) return
        setBuyers(data?.buyers ?? [])
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Could not load confirmed buyers.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <SellerWorkflowChrome
      title="Buyers history"
      subtitle="Buyers appear here after a quotation is accepted and a deal is created."
      activeStepId="buyers"
      prevTo="/seller/product-listed"
      prevLabel="Back"
      nextTo="/seller/quotations"
      nextLabel="Open quotations"
    >
      <div className="b2bGrid2">
        <div className="b2bCard" style={{ gridColumn: '1 / -1' }}>
          <div className="b2bCard__hd">
            <div>
              <h2 className="b2bCard__title">Confirmed buyer accounts</h2>
              <p className="panelSub" style={{ margin: '6px 0 0' }}>
                Only buyers with accepted quotations and active deals are listed here.
              </p>
            </div>
          </div>
          <div className="b2bCard__bd" style={{ padding: 0 }}>
            {loading ? (
              <p className="panelSub" style={{ padding: '1.25rem' }}>
                Loading confirmed buyers…
              </p>
            ) : error ? (
              <p className="panelSub" style={{ padding: '1.25rem', color: 'var(--danger, #b91c1c)' }}>
                {error}
              </p>
            ) : buyers.length === 0 ? (
              <div style={{ padding: '1.25rem' }}>
                <p className="panelSub" style={{ margin: 0 }}>
                  No confirmed buyers yet. Accepted quotations will appear here once deals are created.
                </p>
              </div>
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>City</th>
                      <th>Confirmed deals</th>
                      <th>Last confirmed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.map((buyer) => (
                      <tr key={getPortalUserId(buyer) || buyer.confirmedDeals}>
                        <td><code>{getPortalUserId(buyer) || '—'}</code></td>
                        <td>{buyer.buyerCity || '—'}</td>
                        <td>{buyer.confirmedDeals}</td>
                        <td>{formatDate(buyer.lastConfirmedAt)}</td>
                        <td>
                          <span className="b2bBadge b2bBadge--green">Confirmed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </SellerWorkflowChrome>
  )
}
