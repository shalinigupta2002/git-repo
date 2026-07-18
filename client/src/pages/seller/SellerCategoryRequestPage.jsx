import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchMyCategoReqRequests,
  submitCategoryRequest,
  markCategoryRequestRead,
  markAllCategoryRequestsRead,
} from '../../services/categoryRequest.service.js'
import { fetchShopCategories } from '../../services/shopCategory.service.js'
import { SearchableDropdown } from '../../components/ui/SearchableDropdown.jsx'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PENDING:  { label: 'Pending',  bg: '#fef9c3', color: '#854d0e', border: '#fde047', dot: '#eab308' },
  APPROVED: { label: 'Approved', bg: '#dcfce7', color: '#14532d', border: '#86efac', dot: '#22c55e' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5', dot: '#ef4444' },
}

const TYPE_CFG = {
  CATEGORY:    { label: 'Category',    icon: '📁' },
  SUBCATEGORY: { label: 'Subcategory', icon: '📂' },
}

// ─── Small UI helpers ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { label: status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', dot: '#9ca3af' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.3rem',
      padding: '.22rem .65rem', borderRadius: '999px',
      fontSize: '.73rem', fontWeight: 700, letterSpacing: '.02em',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

function TypeChip({ type }) {
  const c = TYPE_CFG[type] || { label: type, icon: '🗂️' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.3rem',
      padding: '.18rem .55rem', borderRadius: '.35rem',
      fontSize: '.73rem', fontWeight: 600,
      background: type === 'SUBCATEGORY' ? '#ede9fe' : '#dbeafe',
      color: type === 'SUBCATEGORY' ? '#5b21b6' : '#1e40af',
      border: `1px solid ${type === 'SUBCATEGORY' ? '#c4b5fd' : '#93c5fd'}`,
    }}>
      {c.icon} {c.label}
    </span>
  )
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

function SubFolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="12" y1="10" x2="12" y2="16" />
    </svg>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function CategoryRequestPage({ audience = 'seller' }) {
  const [requests,    setRequests]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [unread,      setUnread]      = useState([])

  // form state
  const [categoryName, setCategoryName] = useState('')
  const [subcategoryName, setSubcategoryName] = useState('')
  const [desc, setDesc] = useState('')

  const selectedCategoryNode = categories.find(
    (c) => c.label.toLowerCase() === categoryName.toLowerCase()
  ) ?? null
  const isExistingCategory = selectedCategoryNode !== null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqData, treeData] = await Promise.all([
        fetchMyCategoReqRequests(),
        fetchShopCategories().catch(() => []),
      ])
      const list = reqData.requests || []
      setRequests(list)
      setUnread(list.filter((r) => !r.notificationRead && r.status !== 'PENDING'))
      setCategories(Array.isArray(treeData) ? treeData : [])
    } catch (err) {
      toast.error(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setCategoryName('')
    setSubcategoryName('')
    setDesc('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!categoryName.trim()) return

    setSubmitting(true)
    try {
      if (isExistingCategory) {
        if (!subcategoryName.trim()) {
          toast.error('Please enter a subcategory name')
          setSubmitting(false)
          return
        }
        await submitCategoryRequest({
          requestType: 'SUBCATEGORY',
          categoryName: subcategoryName.trim(),
          parentCategoryName: selectedCategoryNode.label,
          description: desc.trim() || undefined,
        })
        toast.success(`Subcategory request for "${subcategoryName.trim()}" under "${selectedCategoryNode.label}" submitted!`)
      } else {
        await submitCategoryRequest({
          requestType: 'CATEGORY',
          categoryName: categoryName.trim(),
          description: desc.trim() || undefined,
        })
        
        if (subcategoryName.trim()) {
          await submitCategoryRequest({
            requestType: 'SUBCATEGORY',
            categoryName: subcategoryName.trim(),
            parentCategoryName: categoryName.trim(),
            description: desc.trim() || undefined,
          })
        }
        toast.success(`Category request for "${categoryName.trim()}" submitted!`)
      }
      resetForm()
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllCategoryRequestsRead()
      toast.success('All notifications marked as read')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    }
  }

  async function handleMarkRead(id) {
    try {
      await markCategoryRequestRead(id)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    }
  }

  const pendingCount  = requests.filter((r) => r.status === 'PENDING').length
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length

  return (
    <section className="crPage">

      {/* ── Notification banner ─────────────────────────────────────────── */}
      {unread.length > 0 && (
        <div className="crBanner">
          <span className="crBanner__icon"><BellIcon /></span>
          <div className="crBanner__body">
            <strong>New update{unread.length > 1 ? 's' : ''} on your request{unread.length > 1 ? 's' : ''}</strong>
            <span>
              {unread.length} decision{unread.length > 1 ? 's' : ''} from the admin waiting for your review.
            </span>
          </div>
          <button type="button" className="crBanner__cta" onClick={handleMarkAllRead}>
            <CheckCircleIcon /> Mark all as read
          </button>
        </div>
      )}

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="crHero">
        <div className="crHero__left">
          <h1 className="crHero__title">Request a Category</h1>
          <p className="crHero__sub">
            {audience === 'buyer'
              ? "Can't find the right category while browsing products? Submit a request and the admin will review it — you'll be notified once a decision is made."
              : "Can't find the right category for your products? Submit a request and the admin will review it — you'll be notified once a decision is made."}
          </p>
        </div>
        <div className="crHero__stats">
          <div className="crStat">
            <span className="crStat__num">{requests.length}</span>
            <span className="crStat__lbl">Total</span>
          </div>
          <div className="crStat crStat--yellow">
            <span className="crStat__num">{pendingCount}</span>
            <span className="crStat__lbl">Pending</span>
          </div>
          <div className="crStat crStat--green">
            <span className="crStat__num">{approvedCount}</span>
            <span className="crStat__lbl">Approved</span>
          </div>
          <div className="crStat crStat--red">
            <span className="crStat__num">{rejectedCount}</span>
            <span className="crStat__lbl">Rejected</span>
          </div>
        </div>
      </div>

      {/* ── Request form card ─────────────────────────────────────────────── */}
      <div className="crFormCard">
        <div className="crFormCard__header">
          <div className="crFormCard__headerLeft">
            <h2 className="crFormCard__title">Submit a Category Request</h2>
            <p className="crFormCard__sub">Search/select an existing category to request a subcategory, or type a completely new category name.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="crForm">
          <div className="crFormRow">
            <div className="crField">
              <label className="crLabel" htmlFor="categorySelect">
                Category <span className="crRequired">*</span>
              </label>
              <div className="crInputGroup">
                <SearchableDropdown
                  id="categorySelect"
                  options={categories.map((c) => ({ value: c.label, label: c.label }))}
                  value={categoryName}
                  onChange={(val) => {
                    setCategoryName(val)
                    setSubcategoryName('')
                  }}
                  placeholder="Search existing categories or type a new one..."
                  allowCustom={true}
                  required={true}
                />
              </div>
              <p className="crHint">Select an admin-managed category or type a completely new category name.</p>
            </div>
          </div>

          <div className="crFormRow">
            <div className="crField">
              <label className="crLabel" htmlFor="subcategorySelect">
                Subcategory {isExistingCategory && <span className="crRequired">*</span>}
              </label>
              <div className="crInputGroup">
                <SearchableDropdown
                  id="subcategorySelect"
                  options={
                    isExistingCategory && selectedCategoryNode
                      ? (selectedCategoryNode.children || []).map((sub) => ({ value: sub.label, label: sub.label }))
                      : []
                  }
                  value={subcategoryName}
                  onChange={setSubcategoryName}
                  placeholder={
                    categoryName
                      ? isExistingCategory
                        ? "Search existing subcategories or type a new one..."
                        : "Type an optional first subcategory name..."
                      : "Select or type a category first"
                  }
                  disabled={!categoryName}
                  allowCustom={true}
                  required={isExistingCategory}
                />
              </div>
              <p className="crHint">
                {isExistingCategory
                  ? "Choose an existing subcategory or request a new one."
                  : "Optional: Provide a first subcategory under your proposed new category."}
              </p>
            </div>
          </div>

          <div className="crField">
            <label className="crLabel" htmlFor="catDesc">
              Reason / description <span className="crOptional">(optional)</span>
            </label>
            <textarea
              id="catDesc"
              className="crInput crTextarea"
              rows={3}
              placeholder="Explain why this request is needed..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={1000}
            />
            <p className="crHint">{desc.length}/1000 characters</p>
          </div>

          <div className="crFormFooter">
            <button
              type="submit"
              className="crSubmitBtn"
              disabled={submitting || !categoryName.trim() || (isExistingCategory && !subcategoryName.trim())}
            >
              {submitting ? (
                <span className="crSpinner" aria-hidden />
              ) : (
                <SendIcon />
              )}
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
            <button type="button" className="crResetBtn" onClick={resetForm}>
              Clear form
            </button>
          </div>
        </form>
      </div>

      {/* ── My requests list ─────────────────────────────────────────────── */}
      <div className="crListCard">
        <div className="crListCard__header">
          <h2 className="crListCard__title">My Requests</h2>
          <span className="crListCard__count">{requests.length}</span>
        </div>

        {loading ? (
          <div className="crEmptyState">
            <div className="crSpinnerLarge" aria-label="Loading" />
            <p>Loading your requests…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="crEmptyState">
            <span className="crEmptyState__icon">📋</span>
            <p className="crEmptyState__title">No requests yet</p>
            <p className="crEmptyState__sub">Submit your first category request using the form above.</p>
          </div>
        ) : (
          <div className="crTableWrap">
            <table className="crTable">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Category name</th>
                  <th>Parent</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Admin note</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const isUnread = !r.notificationRead && r.status !== 'PENDING'
                  return (
                    <tr key={r.id} className={isUnread ? 'crRow crRow--unread' : 'crRow'}>
                      <td>
                        <TypeChip type={r.requestType || 'CATEGORY'} />
                      </td>
                      <td className="crCell--name">
                        {isUnread && <span className="crDot" aria-label="New notification" />}
                        <span className="crCellName">{r.categoryName}</span>
                      </td>
                      <td className="crCell--muted">
                        {r.parentCategoryName || <em className="crEmpty">—</em>}
                      </td>
                      <td className="crCell--desc">
                        {r.description
                          ? <span title={r.description}>{r.description.length > 60 ? r.description.slice(0, 60) + '…' : r.description}</span>
                          : <em className="crEmpty">—</em>
                        }
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="crCell--note">
                        {r.adminNote
                          ? <span className="crAdminNote">{r.adminNote}</span>
                          : <em className="crEmpty">—</em>
                        }
                      </td>
                      <td className="crCell--date">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        {isUnread && (
                          <button
                            type="button"
                            className="crMarkReadBtn"
                            onClick={() => handleMarkRead(r.id)}
                            title="Mark as read"
                          >
                            <CheckCircleIcon /> Read
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Styles ───────────────────────────────────────────────────────── */}
      <style>{`
        /* Layout */
        .crPage { display: flex; flex-direction: column; gap: 1.5rem; padding: 0; }

        /* Notification banner */
        .crBanner {
          display: flex; align-items: center; gap: .875rem;
          background: linear-gradient(135deg,#fefce8,#fef9c3);
          border: 1px solid #fde047; border-radius: .75rem;
          padding: .875rem 1.125rem; box-shadow: 0 1px 4px rgba(234,179,8,.15);
        }
        .crBanner__icon { color: #ca8a04; flex-shrink:0; display:flex; align-items:center; }
        .crBanner__body { display:flex; flex-direction:column; gap:.1rem; flex:1; }
        .crBanner__body strong { font-size:.88rem; color:#713f12; }
        .crBanner__body span  { font-size:.8rem;  color:#92400e; }
        .crBanner__cta {
          display:inline-flex; align-items:center; gap:.35rem;
          background:#fff; border:1px solid #fde047; border-radius:.45rem;
          padding:.375rem .8rem; font-size:.8rem; font-weight:600; color:#854d0e;
          cursor:pointer; white-space:nowrap; flex-shrink:0;
          transition: background .15s;
        }
        .crBanner__cta:hover { background:#fef9c3; }

        /* Hero */
        .crHero {
          display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem;
          flex-wrap:wrap;
        }
        .crHero__left { flex:1; min-width:220px; }
        .crHero__title { margin:0 0 .4rem; font-size:1.35rem; font-weight:800; color:#111827; }
        .crHero__sub   { margin:0; font-size:.875rem; color:#6b7280; line-height:1.6; }
        .crHero__stats { display:flex; gap:.75rem; flex-wrap:wrap; }
        .crStat {
          background:#fff; border:1px solid #e5e7eb; border-radius:.625rem;
          padding:.625rem 1rem; text-align:center; min-width:72px;
          box-shadow:0 1px 3px rgba(0,0,0,.06);
        }
        .crStat__num { display:block; font-size:1.5rem; font-weight:800; color:#1f2937; }
        .crStat__lbl { display:block; font-size:.72rem; color:#9ca3af; font-weight:500; margin-top:.1rem; }
        .crStat--yellow .crStat__num { color:#d97706; }
        .crStat--green  .crStat__num { color:#16a34a; }
        .crStat--red    .crStat__num { color:#dc2626; }

        /* Form card */
        .crFormCard {
          background:#fff; border:1px solid #e5e7eb; border-radius:.875rem;
          box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden;
        }
        .crFormCard__header {
          display:flex; justify-content:space-between; align-items:flex-start;
          padding:1.25rem 1.5rem 0;
        }
        .crFormCard__title { margin:0 0 .2rem; font-size:1.05rem; font-weight:700; color:#111827; }
        .crFormCard__sub   { margin:0; font-size:.82rem; color:#6b7280; }

        /* Tabs */
        .crTabs {
          display:flex; gap:0; padding:.875rem 1.5rem .25rem;
          border-bottom:1px solid #f3f4f6;
        }
        .crTab {
          display:inline-flex; align-items:center; gap:.4rem;
          padding:.55rem 1.1rem; font-size:.85rem; font-weight:600;
          border:1px solid transparent; border-radius:.45rem;
          background:transparent; cursor:pointer; color:#6b7280;
          transition: all .15s; margin-right:.375rem;
        }
        .crTab:hover { background:#f9fafb; color:#374151; }
        .crTab--active {
          background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;
        }

        /* Form internals */
        .crForm { padding:1.25rem 1.5rem 1.5rem; display:flex; flex-direction:column; gap:1.125rem; }
        .crFormRow { display:flex; gap:1rem; flex-wrap:wrap; }
        .crFormRow--2col .crField { flex:1; min-width:220px; }
        .crField { display:flex; flex-direction:column; gap:.35rem; }
        .crLabel { font-size:.82rem; font-weight:600; color:#374151; }
        .crRequired { color:#ef4444; }
        .crOptional { font-size:.75rem; font-weight:400; color:#9ca3af; }
        .crHint { margin:.1rem 0 0; font-size:.75rem; color:#9ca3af; }
        .crInput {
          width:100%; padding:.6rem .85rem; border:1px solid #d1d5db;
          border-radius:.5rem; font-size:.875rem; color:#111827;
          background:#fff; outline:none; box-sizing:border-box;
          transition: border-color .15s, box-shadow .15s;
        }
        .crInput:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
        .crSelect { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .75rem center; padding-right:2.25rem; }
        .crTextarea { resize:vertical; min-height:90px; }
        .crInputGroup { position:relative; }

        /* Form footer */
        .crFormFooter { display:flex; gap:.75rem; align-items:center; padding-top:.25rem; }
        .crSubmitBtn {
          display:inline-flex; align-items:center; gap:.45rem;
          background:linear-gradient(135deg,#4f46e5,#6366f1); color:#fff;
          border:none; border-radius:.55rem; padding:.65rem 1.4rem;
          font-size:.875rem; font-weight:700; cursor:pointer; letter-spacing:.01em;
          box-shadow:0 2px 8px rgba(99,102,241,.35);
          transition: opacity .15s, transform .1s;
        }
        .crSubmitBtn:hover:not(:disabled)  { opacity:.92; transform:translateY(-1px); }
        .crSubmitBtn:active:not(:disabled) { transform:translateY(0); }
        .crSubmitBtn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .crResetBtn {
          background:none; border:1px solid #e5e7eb; border-radius:.55rem;
          padding:.65rem 1.1rem; font-size:.82rem; font-weight:500; color:#6b7280;
          cursor:pointer; transition: background .15s;
        }
        .crResetBtn:hover { background:#f9fafb; }

        /* Spinner */
        .crSpinner {
          display:inline-block; width:14px; height:14px; border-radius:50%;
          border:2px solid rgba(255,255,255,.4); border-top-color:#fff;
          animation:crSpin .6s linear infinite;
        }
        @keyframes crSpin { to { transform:rotate(360deg); } }

        /* List card */
        .crListCard {
          background:#fff; border:1px solid #e5e7eb; border-radius:.875rem;
          box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden;
        }
        .crListCard__header {
          display:flex; align-items:center; gap:.625rem;
          padding:1.125rem 1.5rem; border-bottom:1px solid #f3f4f6;
        }
        .crListCard__title { margin:0; font-size:1rem; font-weight:700; color:#111827; }
        .crListCard__count {
          background:#f3f4f6; color:#6b7280; border-radius:999px;
          padding:.15rem .6rem; font-size:.78rem; font-weight:700;
        }

        /* Table */
        .crTableWrap { overflow-x:auto; }
        .crTable {
          width:100%; border-collapse:collapse; font-size:.85rem;
        }
        .crTable thead tr { background:#f9fafb; border-bottom:1px solid #e5e7eb; }
        .crTable th {
          padding:.7rem 1rem; text-align:left; font-size:.75rem; font-weight:600;
          color:#6b7280; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap;
        }
        .crRow { border-bottom:1px solid #f3f4f6; transition:background .1s; }
        .crRow:last-child { border-bottom:none; }
        .crRow:hover { background:#f9fafb; }
        .crRow--unread { background:#fefce8; }
        .crRow--unread:hover { background:#fef9c3; }
        .crTable td { padding:.75rem 1rem; vertical-align:middle; }
        .crCell--name { font-weight:600; color:#111827; display:flex; align-items:center; gap:.4rem; white-space:nowrap; }
        .crCellName { font-weight:600; color:#111827; }
        .crCell--muted { color:#6b7280; font-size:.82rem; }
        .crCell--desc  { color:#6b7280; font-size:.82rem; max-width:200px; }
        .crCell--note  { color:#374151; font-size:.82rem; max-width:180px; }
        .crCell--date  { font-size:.8rem; color:#9ca3af; white-space:nowrap; }
        .crDot {
          display:inline-block; width:8px; height:8px; border-radius:50%;
          background:#f59e0b; flex-shrink:0; box-shadow:0 0 0 3px rgba(245,158,11,.2);
        }
        .crAdminNote {
          display:inline-block; background:#f0f9ff; border:1px solid #bae6fd;
          border-radius:.35rem; padding:.15rem .5rem; font-size:.78rem; color:#0369a1;
        }
        .crEmpty { color:#d1d5db; font-style:italic; }
        .crMarkReadBtn {
          display:inline-flex; align-items:center; gap:.3rem;
          background:#f0fdf4; border:1px solid #86efac; border-radius:.4rem;
          padding:.25rem .65rem; font-size:.75rem; font-weight:600; color:#15803d;
          cursor:pointer; white-space:nowrap; transition:background .15s;
        }
        .crMarkReadBtn:hover { background:#dcfce7; }

        /* Empty state */
        .crEmptyState {
          display:flex; flex-direction:column; align-items:center;
          padding:3rem 1rem; text-align:center; gap:.5rem;
        }
        .crEmptyState__icon { font-size:2.5rem; opacity:.4; }
        .crEmptyState__title { margin:0; font-weight:700; color:#374151; }
        .crEmptyState__sub   { margin:0; font-size:.85rem; color:#9ca3af; }
        .crSpinnerLarge {
          width:32px; height:32px; border-radius:50%;
          border:3px solid #e5e7eb; border-top-color:#6366f1;
          animation:crSpin .8s linear infinite;
        }

        @media (max-width:640px) {
          .crHero { flex-direction:column; }
          .crFormCard__header { flex-direction:column; }
          .crForm { padding:1rem; }
          .crTabs { padding:.625rem 1rem .25rem; }
          .crListCard__header { padding:.875rem 1rem; }
          .crTable th, .crTable td { padding:.6rem .75rem; }
        }
      `}</style>
    </section>
  )
}

export function SellerCategoryRequestPage() {
  return <CategoryRequestPage audience="seller" />
}

export function BuyerCategoryRequestPage() {
  return <CategoryRequestPage audience="buyer" />
}
