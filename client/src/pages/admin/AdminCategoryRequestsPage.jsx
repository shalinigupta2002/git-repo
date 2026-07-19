import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAdminCategoryRequests,
  decideCategoryRequest,
  fetchAdminCategories,
} from '../../services/admin.service.js'
import { EmptyState } from '../../components/common/EmptyState.jsx'
import { DealListSkeleton } from '../../components/deals/LoadingSkeleton.jsx'

const STATUS_LABELS = {
  PENDING:  { label: 'Pending Approval',  color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  APPROVED: { label: 'Approved', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || { label: status, color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb' }
  return (
    <span
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        padding:      '0.25rem 0.75rem',
        borderRadius: '20px',
        fontSize:     '0.75rem',
        fontWeight:   600,
        background:   cfg.bg,
        color:        cfg.color,
        border:       `1px solid ${cfg.border}`,
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
  const [parentId, setParentId]   = useState(
    request.parentCategoryId ? String(request.parentCategoryId) : '',
  )
  const [roots, setRoots]         = useState([])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (request.requestType !== 'SUBCATEGORY') return
    fetchAdminCategories()
      .then((data) => {
        const list = data.categories || []
        setRoots(list)
        if (request.parentCategoryId) {
          setParentId(String(request.parentCategoryId))
        } else if (request.parentCategoryName) {
          const match = list.find(
            (c) => c.name.toLowerCase() === request.parentCategoryName.toLowerCase(),
          )
          if (match) setParentId(String(match.id))
        }
      })
      .catch(() => {})
  }, [request.id, request.requestType, request.parentCategoryName, request.parentCategoryId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (decision === 'APPROVED' && request.requestType === 'SUBCATEGORY' && !parentId) {
      toast.error('Select a parent category before approving this subcategory request')
      return
    }
    setSaving(true)
    try {
      await decideCategoryRequest(request.id, {
        decision,
        adminNote,
        name: catName,
        parentId: request.requestType === 'SUBCATEGORY' ? Number(parentId) : undefined,
      })
      toast.success(decision === 'APPROVED' ? 'Request approved & catalog updated' : 'Request rejected successfully')
      onDecided()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ borderRadius: '16px', padding: '2rem', maxWidth: '520px' }}>
        <h3 className="modal__title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 1.25rem' }}>Review Catalog Request</h3>
        
        {/* Meta summary panel */}
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '1rem', border: '1px solid #f3f4f6', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <p style={{ margin: 0, color: '#4b5563' }}>
            <strong style={{ color: '#111827' }}>Seller:</strong> {request.seller?.companyName || '—'} ({request.seller?.email})
          </p>
          <p style={{ margin: 0, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong style={{ color: '#111827' }}>Request type:</strong>{' '}
            <span style={{
              padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
              background: request.requestType === 'SUBCATEGORY' ? '#faf5ff' : '#eff6ff',
              color: request.requestType === 'SUBCATEGORY' ? '#7e22ce' : '#1d4ed8',
              border: `1px solid ${request.requestType === 'SUBCATEGORY' ? '#e9d5ff' : '#bfdbfe'}`
            }}>
              {request.requestType === 'SUBCATEGORY' ? 'SUBCATEGORY' : 'CATEGORY'}
            </span>
          </p>
          {request.requestType === 'SUBCATEGORY' && request.parentCategoryName ? (
            <p style={{ margin: 0, color: '#4b5563' }}>
              <strong style={{ color: '#111827' }}>Parent category:</strong> {request.parentCategoryName}
            </p>
          ) : null}
          <p style={{ margin: 0, color: '#4b5563' }}>
            <strong style={{ color: '#111827' }}>Requested name:</strong>{' '}
            <code style={{ background: '#e5e7eb', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{request.categoryName}</code>
          </p>
          {request.description ? (
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
              <strong style={{ color: '#111827' }}>Reason:</strong> &ldquo;{request.description}&rdquo;
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="modal__form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Review Decision</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input type="radio" value="APPROVED" checked={decision === 'APPROVED'} onChange={() => setDecision('APPROVED')} style={{ accentColor: '#059669' }} />
                <span style={{ color: '#059669', fontWeight: 600 }}>Approve & Add to Catalog</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                <input type="radio" value="REJECTED" checked={decision === 'REJECTED'} onChange={() => setDecision('REJECTED')} style={{ accentColor: '#dc2626' }} />
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Reject Request</span>
              </label>
            </div>
          </div>

          {decision === 'APPROVED' && request.requestType === 'SUBCATEGORY' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="parentId" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Parent category (required)
              </label>
              <select
                id="parentId"
                className="formInput"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              >
                <option value="">Select parent category</option>
                {roots.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          {decision === 'APPROVED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="catName" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Catalog Name (Adjust spelling/casing if needed)
              </label>
              <input
                id="catName"
                className="formInput"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                required
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="adminNote" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Admin Explanation Note (Dispatched to seller)
            </label>
            <textarea
              id="adminNote"
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Provide context or explanation for this status decision…"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem', resize: 'vertical' }}
            />
          </div>

          <div className="modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btnOutline" onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '0.5rem 1.25rem', 
                borderRadius: '8px', 
                background: decision === 'APPROVED' ? '#111827' : '#dc2626', 
                color: '#fff', 
                border: 0,
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
              disabled={saving}
            >
              {saving ? 'Processing…' : decision === 'APPROVED' ? 'Approve & Create' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modalOverlay { position:fixed; inset:0; background:rgba(17,24,39,0.5); backdrop-filter: blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .modal { background:#fff; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
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
    <section className="panel dealPage" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="panelTitle" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Category Requests</h2>
          <p className="panelSub" style={{ color: '#4b5563', marginTop: '0.25rem' }}>Moderate and approve custom categories requested by marketplace sellers.</p>
        </div>
        <div className="filterTabs" style={{ display: 'flex', gap: '0.5rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '10px' }}>
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 0,
                background: filter === s ? '#ffffff' : 'transparent',
                color: filter === s ? '#111827' : '#4b5563',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: filter === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {s === 'ALL' ? 'All Requests' : STATUS_LABELS[s]?.label.split(' ')[0] || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <DealListSkeleton rows={3} />
      ) : requests.length === 0 ? (
        <EmptyState title="No requests found" description={`There are no ${filter.toLowerCase()} category requests at the moment.`} />
      ) : (
        <div className="tableWrap" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>
                <th style={{ padding: '1rem 1.5rem' }}>Seller Company</th>
                <th style={{ padding: '1rem 1.5rem' }}>Type & Requested Name</th>
                <th style={{ padding: '1rem 1.5rem' }}>Purpose Description</th>
                <th style={{ padding: '1rem 1.5rem' }}>Status Badge</th>
                <th style={{ padding: '1rem 1.5rem' }}>Submitted</th>
                <th style={{ padding: '1rem 1.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s', hover: { background: '#f9fafb' } }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{r.seller?.companyName || '—'}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.seller?.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                        background: r.requestType === 'SUBCATEGORY' ? '#faf5ff' : '#eff6ff',
                        color: r.requestType === 'SUBCATEGORY' ? '#7e22ce' : '#1d4ed8',
                        border: `1px solid ${r.requestType === 'SUBCATEGORY' ? '#e9d5ff' : '#bfdbfe'}`
                      }}>
                        {r.requestType === 'SUBCATEGORY' ? 'Subcategory' : 'Category'}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{r.categoryName}</strong>
                      {r.parentCategoryName && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          under parent: <em>{r.parentCategoryName}</em>
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', maxWidth: 260, color: '#4b5563', fontSize: '0.825rem', lineBreak: 'anywhere' }}>
                    {r.description || <em style={{ color: '#9ca3af' }}>No details provided</em>}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <StatusBadge status={r.status} />
                      {r.adminNote && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          Note: &ldquo;{r.adminNote}&rdquo;
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {r.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => setReviewing(r)}
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '0.4rem 0.85rem', 
                          borderRadius: '8px', 
                          background: '#111827', 
                          color: '#fff', 
                          border: 0,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Review
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.825rem', fontWeight: 500 }}>Completed</span>
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
    </section>
  )
}
export default AdminCategoryRequestsPage
