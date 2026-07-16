import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminCategoryRequests,
  decideCategoryRequest,
} from '../../services/admin.service.js'

const STATUS_LABELS = {
  PENDING:  { label: 'Pending',  color: '#f59e0b' },
  APPROVED: { label: 'Approved', color: '#10b981' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || { label: status, color: '#6b7280' }
  return (
    <span
      style={{
        display:      'inline-block',
        padding:      '.2rem .55rem',
        borderRadius: '999px',
        fontSize:     '.75rem',
        fontWeight:   600,
        background:   cfg.color + '20',
        color:        cfg.color,
        border:       `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.label}
    </span>
  )
}

function DecideModal({ request, onClose, onDecided }) {
  const [decision, setDecision]   = useState('APPROVED')
  const [adminNote, setAdminNote] = useState('')
  const [catName, setCatName]     = useState(request.categoryName)
  const [saving, setSaving]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await decideCategoryRequest(request.id, { decision, adminNote, name: catName })
      toast.success(decision === 'APPROVED' ? 'Request approved & category created' : 'Request rejected')
      onDecided()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">Review Category Request</h3>
        <div className="modal__meta">
          <p><strong>Seller:</strong> {request.seller?.companyName || request.seller?.email}</p>
          <p>
            <strong>Type:</strong>{' '}
            <span style={{
              padding: '.15rem .5rem', borderRadius: '.3rem', fontSize: '.78rem', fontWeight: 600,
              background: request.requestType === 'SUBCATEGORY' ? '#ede9fe' : '#dbeafe',
              color: request.requestType === 'SUBCATEGORY' ? '#5b21b6' : '#1e40af',
            }}>
              {request.requestType === 'SUBCATEGORY' ? '📂 Subcategory' : '📁 Category'}
            </span>
          </p>
          <p><strong>Requested name:</strong> {request.categoryName}</p>
          {request.parentCategoryName && (
            <p><strong>Parent category:</strong> {request.parentCategoryName}</p>
          )}
          {request.description && <p><strong>Description:</strong> {request.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="formGroup">
            <label className="formLabel">Decision</label>
            <div className="radioGroup">
              <label className="radioOption">
                <input type="radio" value="APPROVED" checked={decision === 'APPROVED'} onChange={() => setDecision('APPROVED')} />
                <span style={{ color: '#10b981', fontWeight: 600 }}>Approve</span>
              </label>
              <label className="radioOption">
                <input type="radio" value="REJECTED" checked={decision === 'REJECTED'} onChange={() => setDecision('REJECTED')} />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>Reject</span>
              </label>
            </div>
          </div>

          {decision === 'APPROVED' && (
            <div className="formGroup">
              <label className="formLabel" htmlFor="catName">Category name (editable)</label>
              <input
                id="catName"
                className="formInput"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="formGroup">
            <label className="formLabel" htmlFor="adminNote">Note to seller (optional)</label>
            <textarea
              id="adminNote"
              className="formInput"
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Explain your decision…"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="modal__footer">
            <button type="submit" className={`btn ${decision === 'APPROVED' ? 'btn--primary' : 'btn--danger'}`} disabled={saving}>
              {saving ? 'Saving…' : decision === 'APPROVED' ? 'Approve & create category' : 'Reject request'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modalOverlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal { background:#fff; border-radius:.75rem; padding:1.5rem; width:min(480px,92vw); box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .modal__title { margin:0 0 1rem; font-size:1.1rem; font-weight:700; }
        .modal__meta { font-size:.875rem; color:#374151; margin-bottom:1rem; display:flex; flex-direction:column; gap:.25rem; }
        .modal__meta p { margin:0; }
        .modal__form { display:flex; flex-direction:column; gap:.875rem; }
        .modal__footer { display:flex; gap:.5rem; }
        .radioGroup { display:flex; gap:1.25rem; }
        .radioOption { display:flex; align-items:center; gap:.4rem; cursor:pointer; font-size:.9rem; }
        .btn--danger { background:#ef4444; color:#fff; border:none; border-radius:.4rem; padding:.5rem 1rem; font-weight:600; cursor:pointer; }
        .btn--danger:hover { background:#dc2626; }
      `}</style>
    </div>
  )
}

export function AdminCategoryRequestsPage() {
  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('PENDING')
  const [reviewing, setReviewing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminCategoryRequests(filter !== 'ALL' ? filter : undefined)
      setRequests(data.requests || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">Category Requests</h2>
          <p className="panelSub">Review and approve or reject seller category requests.</p>
        </div>
        <div className="filterTabs">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button
              key={s}
              type="button"
              className={`filterTab${filter === s ? ' filterTab--active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'ALL' ? 'All' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="panelSub" style={{ padding: '1rem 0' }}>Loading…</p>
      ) : requests.length === 0 ? (
        <p className="panelSub" style={{ padding: '1rem 0' }}>No requests found.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Category requested</th>
                <th>Description</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{r.seller?.companyName || '—'}</span>
                    <br />
                    <small style={{ color: '#6b7280' }}>{r.seller?.email}</small>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', marginBottom: '.3rem',
                      padding: '.15rem .5rem', borderRadius: '.3rem', fontSize: '.72rem', fontWeight: 600,
                      background: r.requestType === 'SUBCATEGORY' ? '#ede9fe' : '#dbeafe',
                      color: r.requestType === 'SUBCATEGORY' ? '#5b21b6' : '#1e40af',
                    }}>
                      {r.requestType === 'SUBCATEGORY' ? '📂 Subcategory' : '📁 Category'}
                    </span>
                    <div style={{ fontWeight: 600 }}>{r.categoryName}</div>
                    {r.parentCategoryName && (
                      <div style={{ fontSize: '.78rem', color: '#6b7280', marginTop: '.2rem' }}>
                        under: <em>{r.parentCategoryName}</em>
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 220, color: '#6b7280', fontSize: '.85rem' }}>
                    {r.description || <em>No description</em>}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.adminNote && (
                      <div style={{ fontSize: '.75rem', color: '#6b7280', marginTop: '.25rem' }}>
                        Note: {r.adminNote}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '.82rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {r.status === 'PENDING' ? (
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ fontSize: '.8rem', padding: '.35rem .75rem' }}
                        onClick={() => setReviewing(r)}
                      >
                        Review
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '.82rem' }}>Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewing && (
        <DecideModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDecided={() => { setReviewing(null); load() }}
        />
      )}

      <style>{`
        .filterTabs { display:flex; gap:.375rem; flex-wrap:wrap; }
        .filterTab { padding:.375rem .75rem; border-radius:.4rem; border:1px solid var(--border,#e5e7eb); background:transparent; cursor:pointer; font-size:.82rem; font-weight:500; color:var(--text-muted,#6b7280); }
        .filterTab--active { background:var(--primary,#2563eb); color:#fff; border-color:var(--primary,#2563eb); }
        .filterTab:hover:not(.filterTab--active) { background:var(--surface-alt,#f3f4f6); }
      `}</style>
    </section>
  )
}
