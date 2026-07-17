import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SellerIdentity, BuyerIdentity } from '../common/SellerIdentity.jsx'
import { SubscribeFeatureAlert } from '../common/SubscribeFeatureAlert.jsx'
import { PageLoader } from '../ui/PageLoader.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import {
  acceptQuote,
  cancelQuoteRequest,
  fetchRfqStats,
  getQuoteRequest,
  listGroupedRfqs,
  listQuoteRequests,
  rejectQuote,
  rejectQuoteBySeller,
  respondToQuote,
} from '../../services/quoteRequest.service.js'
import { useRfqNotifications } from '../../hooks/useRfqNotifications.js'
import {
  QUOTE_STATUS_BADGE,
  QUOTE_STATUS_LABELS,
  formatQuotationDate,
  formatQuoteMoney,
  getQuoteStatusDisplay,
  isBuyerQuotationActionable,
  isQuoteExpired,
  quoteLineTotal,
} from '../../utils/quotationHelpers.js'
import { RfqAttachmentsList } from './RfqAttachmentsList.jsx'

const BUYER_FILTERS = [
  { id: 'all', label: 'My RFQs' },
  { id: 'PENDING', label: 'Waiting response' },
  { id: 'RESPONDED', label: 'Responses' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'DECLINED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'expired', label: 'Expired' },
]

const SELLER_FILTERS = [
  { id: 'all', label: 'Incoming' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'RESPONDED', label: 'Responded' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'NOT_SELECTED', label: 'Not selected' },
  { id: 'DECLINED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'expired', label: 'Expired' },
]

const PAGE_SIZE = 10

function StatusBadge({ status, expired = false, mode = 'buyer' }) {
  const { label, badge } = getQuoteStatusDisplay(status, { expired, mode })
  return <span className={`b2bBadge ${badge}`}>{label}</span>
}

function RfqStatsBar({ stats, mode }) {
  if (!stats) return null
  const items = mode === 'buyer'
    ? [
        { label: 'My RFQs', value: stats.myRfqs },
        { label: 'Waiting', value: stats.pending },
        { label: 'Responses', value: stats.sellerResponses },
        { label: 'Accepted', value: stats.accepted },
        { label: 'Rejected', value: stats.rejected },
        { label: 'Expired', value: stats.expired },
      ]
    : [
        { label: 'Incoming', value: stats.incoming },
        { label: 'Pending', value: stats.pendingResponses },
        { label: 'Responded', value: stats.responded },
        { label: 'Accepted', value: stats.acceptedDeals },
        { label: 'Rejected', value: stats.rejected },
        { label: 'Expired', value: stats.expired },
      ]

  return (
    <div className="quoteStatsBar panel panel--flush">
      {items.map((item) => (
        <div key={item.label} className="quoteStatsBar__item">
          <span className="quoteStatsBar__value">{item.value ?? 0}</span>
          <span className="quoteStatsBar__label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function QuotationTimeline({ request, mode }) {
  const currency = request?.sellerCurrency || 'INR'

  return (
    <div className="quoteThread panel">
      <h3 className="quoteSide__title">Quotation timeline · {request?.rfqNumber || request?.rfqRef || 'RFQ'}</h3>

      <section className="quoteTimelineBlock">
        <p className="quoteTimelineBlock__label">
          {mode === 'buyer' ? 'Your RFQ' : 'Buyer RFQ'}
        </p>
        <p>{request?.message || 'No requirement provided.'}</p>
        <dl className="b2bRfqMeta quoteTimelineMeta">
          <div>
            <dt>Quantity</dt>
            <dd>{request?.quantity}</dd>
          </div>
          <div>
            <dt>Delivery location</dt>
            <dd>{request?.deliveryLocation || '—'}</dd>
          </div>
          <div>
            <dt>Expected delivery</dt>
            <dd>{formatQuotationDate(request?.expectedDeliveryDate)}</dd>
          </div>
          {request?.targetPrice != null ? (
            <div>
              <dt>Indicative budget (unit)</dt>
              <dd>{formatQuoteMoney(request.targetPrice, currency)}</dd>
            </div>
          ) : null}
        </dl>
        <RfqAttachmentsList attachments={request?.attachments} />
        <p className="quoteTimelineBlock__date">{formatQuotationDate(request?.createdAt)}</p>
      </section>

      {request?.status !== 'PENDING' ? (
        <section className="quoteTimelineBlock">
          <p className="quoteTimelineBlock__label">
            {mode === 'seller' ? 'Your quotation' : 'Seller quotation'}
          </p>
          <dl className="b2bRfqMeta quoteTimelineMeta">
            <div>
              <dt>Final unit price</dt>
              <dd>{formatQuoteMoney(request?.sellerUnitPrice, currency)}</dd>
            </div>
            <div>
              <dt>Line total</dt>
              <dd>{formatQuoteMoney(quoteLineTotal(request), currency)}</dd>
            </div>
            {request?.quoteValidUntil ? (
              <div>
                <dt>Valid until</dt>
                <dd>{formatQuotationDate(request.quoteValidUntil)}</dd>
              </div>
            ) : null}
            {request?.taxNote ? (
              <div>
                <dt>Tax</dt>
                <dd>{request.taxNote}</dd>
              </div>
            ) : null}
            {request?.freightNote ? (
              <div>
                <dt>Delivery time / freight</dt>
                <dd>{request.freightNote}</dd>
              </div>
            ) : null}
            {request?.exclusionsNote ? (
              <div>
                <dt>Remarks</dt>
                <dd>{request.exclusionsNote}</dd>
              </div>
            ) : null}
          </dl>
          <p className="quoteTimelineBlock__date">
            {formatQuotationDate(request?.sellerRespondedAt || request?.updatedAt)}
          </p>
        </section>
      ) : (
        <div className="quoteTimelineWaiting">
          {mode === 'seller'
            ? 'Send your final quotation below.'
            : 'Waiting for the seller to send a quotation.'}
        </div>
      )}

      {request?.status === 'ACCEPTED' ? (
        <div className="quoteTimelineOutcome quoteTimelineOutcome--success">
          Quotation accepted
          {request?.order?.orderNumber ? (
            <span> · Deal {request.order.orderNumber}</span>
          ) : null}
        </div>
      ) : null}

      {request?.status === 'DECLINED' ? (
        <div className="quoteTimelineOutcome quoteTimelineOutcome--muted">Quotation declined</div>
      ) : null}
    </div>
  )
}

function SellerQuotationForm({ request, onSubmitted }) {
  const [unitPrice, setUnitPrice] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [taxNote, setTaxNote] = useState('')
  const [freightNote, setFreightNote] = useState('')
  const [exclusionsNote, setExclusionsNote] = useState('')
  const [submitting, setSubmitting] = useState('')

  useEffect(() => {
    if (!request) return
    setUnitPrice(request.sellerUnitPrice != null ? String(request.sellerUnitPrice) : '')
    setValidUntil(request.quoteValidUntil ? new Date(request.quoteValidUntil).toISOString().slice(0, 16) : '')
    setTaxNote(request.taxNote || '')
    setFreightNote(request.freightNote || '')
    setExclusionsNote(request.exclusionsNote || '')
    setSubmitting('')
  }, [request?.id, request?.revisionCount, request?.sellerUnitPrice])

  async function handleSubmit(event) {
    event.preventDefault()
    const price = Number(unitPrice)
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a valid final unit price.')
      return
    }
    setSubmitting('send')
    try {
      await respondToQuote(request.id, {
        sellerUnitPrice: price,
        sellerCurrency: 'INR',
        quoteValidUntil: validUntil || null,
        taxNote: taxNote.trim() || null,
        freightNote: freightNote.trim() || null,
        exclusionsNote: exclusionsNote.trim() || null,
      })
      toast.success(request?.status === 'RESPONDED' ? 'Quotation updated.' : 'Final quotation sent to buyer.')
      onSubmitted?.()
    } catch (error) {
      toast.error(error?.message || 'Could not send quotation.')
    } finally {
      setSubmitting('')
    }
  }

  async function handleReject() {
    setSubmitting('reject')
    try {
      await rejectQuoteBySeller(request.id)
      toast.success('RFQ declined.')
      onSubmitted?.()
    } catch (error) {
      toast.error(error?.message || 'Could not decline RFQ.')
    } finally {
      setSubmitting('')
    }
  }

  return (
    <div className="quoteRespond panel">
      <h3 className="quoteRespond__title">
        {request?.status === 'RESPONDED' ? 'Revise quotation' : 'Send final quotation'}
      </h3>
      {request?.targetPrice != null ? (
        <div className="quoteBudgetHighlight">
          <p className="quoteBudgetHighlight__label">Buyer indicative budget (unit)</p>
          <p className="quoteBudgetHighlight__price">
            {formatQuoteMoney(request.targetPrice)} <span>/ unit</span>
          </p>
          <p className="quoteBudgetHighlight__meta">Quantity {request.quantity}</p>
        </div>
      ) : null}
      {request?.message ? (
        <p className="quoteBudgetHighlight__message">&ldquo;{request.message}&rdquo;</p>
      ) : null}
      <form className="quoteRespond__grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="fieldLabel">Final unit price (INR)</span>
          <input type="number" min={0} step="0.01" className="input" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
        </label>
        <label className="field">
          <span className="fieldLabel">Quotation valid until</span>
          <input type="datetime-local" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </label>
        <label className="field">
          <span className="fieldLabel">Delivery time</span>
          <input type="text" className="input" placeholder="e.g. 7–10 business days" value={freightNote} onChange={(e) => setFreightNote(e.target.value)} />
        </label>
        <label className="field quoteRespond__full">
          <span className="fieldLabel">Tax note</span>
          <input type="text" className="input" placeholder="Optional" value={taxNote} onChange={(e) => setTaxNote(e.target.value)} />
        </label>
        <label className="field quoteRespond__full">
          <span className="fieldLabel">Remarks</span>
          <input type="text" className="input" placeholder="Optional terms or exclusions" value={exclusionsNote} onChange={(e) => setExclusionsNote(e.target.value)} />
        </label>
        <div className="quoteBuyerActions__buttons">
          <button type="submit" className="btn btn--primary" disabled={Boolean(submitting)}>
            {submitting === 'send' ? 'Sending…' : request?.status === 'RESPONDED' ? 'Update quotation' : 'Send quotation'}
          </button>
          {request?.status === 'PENDING' ? (
            <button type="button" className="btn btn--ghost" disabled={Boolean(submitting)} onClick={handleReject}>
              {submitting === 'reject' ? 'Declining…' : 'Decline RFQ'}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

function BuyerPendingActions({ request, onUpdated }) {
  const [busy, setBusy] = useState('')

  async function handleCancel() {
    setBusy('cancel')
    try {
      await cancelQuoteRequest(request.id)
      toast.success('RFQ cancelled for this seller.')
      onUpdated?.()
    } catch (error) {
      toast.error(error?.message || 'Could not cancel RFQ.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="quoteBuyerActions panel">
      <h3 className="quoteRespond__title">Pending seller response</h3>
      <p className="quoteLockedCopy">
        You can cancel this seller-specific RFQ while it is still awaiting a quotation.
      </p>
      <button type="button" className="btn btn--ghost" disabled={Boolean(busy)} onClick={handleCancel}>
        {busy === 'cancel' ? 'Cancelling…' : 'Cancel RFQ for this seller'}
      </button>
    </div>
  )
}

function BuyerActions({ request, onUpdated }) {
  const [busy, setBusy] = useState('')
  const navigate = useNavigate()
  const expired = isQuoteExpired(request)
  const actionable = isBuyerQuotationActionable(request)

  async function handleAccept() {
    setBusy('accept')
    try {
      const data = await acceptQuote(request.id)
      toast.success('Quotation accepted.')
      onUpdated?.(data?.request)
      if (data?.order?.id) navigate('/buyer/transactions')
    } catch (error) {
      toast.error(error?.message || 'Could not accept quotation.')
    } finally {
      setBusy('')
    }
  }

  async function handleReject() {
    setBusy('reject')
    try {
      await rejectQuote(request.id)
      toast.success('Quotation declined.')
      onUpdated?.()
    } catch (error) {
      toast.error(error?.message || 'Could not decline quotation.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="quoteBuyerActions panel">
      <h3 className="quoteRespond__title">Review seller quotation</h3>
      {expired || !actionable ? (
        <p className="quoteLockedCopy">
          {request?.status === 'NOT_SELECTED' || request?.buyerDisplayStatus === 'EXPIRED'
            ? 'This quotation is no longer available because you finalized another seller.'
            : 'This quotation has expired. Request a new RFQ from the seller.'}
        </p>
      ) : (
        <div className="quoteBuyerActions__buttons">
          <button type="button" className="btn btn--primary" disabled={Boolean(busy)} onClick={handleAccept}>
            {busy === 'accept' ? 'Accepting…' : 'Accept quotation'}
          </button>
          <button type="button" className="btn btn--ghost" disabled={Boolean(busy)} onClick={handleReject}>
            {busy === 'reject' ? 'Declining…' : 'Reject quotation'}
          </button>
        </div>
      )}
    </div>
  )
}

export function QuotationWorkspace({ mode, basePath }) {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [requests, setRequests] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 })
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [listError, setListError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [subscribeAlertOpen, setSubscribeAlertOpen] = useState(false)
  const { unreadCount } = useRfqNotifications({ enabled: hasFullAccess })

  const viewAs = mode
  const filters = mode === 'buyer' ? BUYER_FILTERS : SELLER_FILTERS

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchRfqStats({ viewAs })
      setStats(data?.stats || null)
    } catch {
      setStats(null)
    }
  }, [viewAs])

  const loadList = useCallback(async () => {
    setLoadingList(true)
    setListError('')
    try {
      if (mode === 'buyer') {
        const params = {
          page,
          limit: PAGE_SIZE,
          q: search || undefined,
          status: filter === 'all' || filter === 'expired' ? undefined : filter,
          expired: filter === 'expired' ? true : undefined,
        }
        const data = await listGroupedRfqs(params)
        setGroups(Array.isArray(data?.items) ? data.items : [])
        setPagination(data?.pagination || { page: 1, totalPages: 0, total: 0 })
        setHasFullAccess(Boolean(data?.hasFullAccess))
      } else {
        const data = await listQuoteRequests({
          viewAs,
          page,
          limit: PAGE_SIZE,
          q: search || undefined,
          status: filter === 'all' || filter === 'expired' ? undefined : filter,
          expired: filter === 'expired' ? true : undefined,
        })
        setRequests(Array.isArray(data?.requests) ? data.requests : [])
        setPagination(data?.pagination || { page: 1, totalPages: 0, total: data?.total || 0 })
        setHasFullAccess(Boolean(data?.hasFullAccess))
      }
    } catch (error) {
      setListError(error?.message || 'Failed to load RFQs')
      setGroups([])
      setRequests([])
    } finally {
      setLoadingList(false)
    }
  }, [filter, mode, page, search, viewAs])

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setSelected(null)
      return
    }
    setLoadingDetail(true)
    try {
      const data = await getQuoteRequest(id, { viewAs })
      setSelected(data?.request || null)
      setHasFullAccess(Boolean(data?.hasFullAccess))
    } catch (error) {
      toast.error(error?.message || 'Failed to load RFQ')
      setSelected(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [viewAs])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { loadDetail(requestId) }, [requestId, loadDetail])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const inboxCount = pagination.total

  function selectBuyerGroup(group) {
    if (group.sellerCount > 1) {
      navigate(`${basePath}/group/${group.rfqGroupId}`)
      return
    }
    const firstId = group.quotations?.[0]?.id
    if (firstId) navigate(`${basePath}/${firstId}`)
  }

  function selectRequest(id) {
    navigate(`${basePath}/${id}`)
  }

  function clearSelection() {
    navigate(basePath)
  }

  async function refreshAll() {
    await Promise.all([loadStats(), loadList()])
    if (requestId) await loadDetail(requestId)
  }

  const pageTitle = mode === 'buyer' ? 'RFQs & quotations' : 'Incoming RFQs'

  return (
    <div className="quoteWorkspace">
      <header className="quoteWorkspace__hero">
        <div>
          <p className="quoteWorkspace__eyebrow">Quotation center</p>
          <h1 className="sellerDashboard__greeting">{pageTitle}</h1>
          <p className="sellerDashboard__sub">
            {mode === 'buyer'
              ? 'Track grouped RFQs, compare seller quotations, and accept one offer per request.'
              : 'Review buyer RFQs and respond with final quotations.'}
          </p>
        </div>
        <div className="quoteWorkspace__heroActions">
          {mode === 'buyer' ? (
            <Link to="/products" className="btn btn--ghost">Browse products</Link>
          ) : (
            <Link to="/seller/products" className="btn btn--ghost">View listings</Link>
          )}
        </div>
      </header>

      <RfqStatsBar stats={stats} mode={mode} />

      {!hasFullAccess ? (
        <div className="quoteLockedBanner panel">
          <div>
            <strong>Subscribe to unlock full quotation tools.</strong>
            <p className="quoteLockedCopy">
              You can preview requests, but responding, accepting quotations, and viewing counterpart details require an active {mode} plan.
            </p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>View plans</button>
        </div>
      ) : null}

      <div className="quoteWorkspace__shell">
        <aside className="quoteInbox panel panel--flush">
          <div className="quoteInbox__head">
            <h2 className="quoteInbox__title">Inbox{unreadCount ? ` (${unreadCount} new)` : ''}</h2>
            <span className="quoteInbox__count">{inboxCount}</span>
          </div>

          <div className="quoteInbox__search">
            <input
              type="search"
              className="input"
              placeholder="Search RFQs…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="quoteInbox__filters" role="tablist" aria-label="Filter quotations">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`quoteFilterChip${filter === item.id ? ' quoteFilterChip--active' : ''}`}
                onClick={() => { setFilter(item.id); setPage(1) }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loadingList ? (
            <div className="quoteInbox__loading"><Spinner size="sm" /> Loading…</div>
          ) : listError ? (
            <p className="quoteInbox__empty" role="alert">{listError}</p>
          ) : mode === 'buyer' ? (
            groups.length === 0 ? (
              <div className="quoteInbox__empty">
                <p>No RFQs yet.</p>
                <Link to="/products" className="metricCard__link">Browse products to request a quote →</Link>
              </div>
            ) : (
              <>
                <ul className="quoteInbox__list">
                  {groups.map((group) => (
                    <li key={group.rfqGroupId}>
                      <button type="button" className="quoteInboxItem" onClick={() => selectBuyerGroup(group)}>
                        <div className="quoteInboxItem__top">
                          <strong>{group.productTitle}</strong>
                          <StatusBadge status={group.aggregateStatus} expired={group.hasExpiredQuotation} mode={mode} />
                        </div>
                        <p className="quoteInboxItem__meta">
                          {group.rfqNumber || group.rfqRef} · Qty {group.quantity} · {group.sellerCount} seller{group.sellerCount === 1 ? '' : 's'}
                        </p>
                        <span className="quoteInboxItem__date">{formatQuotationDate(group.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {pagination.totalPages > 1 ? (
                  <div className="quoteInbox__pagination">
                    <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button type="button" className="btn btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                ) : null}
              </>
            )
          ) : requests.length === 0 ? (
            <div className="quoteInbox__empty">
              <p>No RFQs yet.</p>
              <p className="quoteLockedCopy">Buyer RFQs will appear here when they request quotations.</p>
            </div>
          ) : (
            <>
              <ul className="quoteInbox__list">
                {requests.map((item) => {
                  const active = item.id === requestId
                  const expired = mode === 'buyer'
                    ? isQuoteExpired(item)
                    : item.status === 'RESPONDED' && isQuoteExpired(item)
                  return (
                    <li key={item.id}>
                      <button type="button" className={`quoteInboxItem${active ? ' quoteInboxItem--active' : ''}`} onClick={() => selectRequest(item.id)}>
                        <div className="quoteInboxItem__top">
                          <strong>{item.productTitle}</strong>
                          <StatusBadge status={item.status} expired={expired} mode={mode} />
                        </div>
                        <p className="quoteInboxItem__meta">{item.rfqNumber || item.rfqRef} · Qty {item.quantity}</p>
                        <span className="quoteInboxItem__date">{formatQuotationDate(item.createdAt)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {pagination.totalPages > 1 ? (
                <div className="quoteInbox__pagination">
                  <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {pagination.page} of {pagination.totalPages}</span>
                  <button type="button" className="btn btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              ) : null}
            </>
          )}
        </aside>

        <section className="quoteDetail">
          {!requestId ? (
            <div className="quoteDetail__empty panel">
              <h2>Select an RFQ</h2>
              <p>Choose a request from the inbox to view details and take action.</p>
            </div>
          ) : loadingDetail ? (
            <PageLoader label="Loading RFQ" />
          ) : !selected ? (
            <div className="quoteDetail__empty panel">
              <h2>RFQ unavailable</h2>
              <button type="button" className="btn btn--ghost" onClick={clearSelection}>Back to inbox</button>
            </div>
          ) : (
            <>
              <div className="quoteDetail__head panel">
                <div>
                  <button type="button" className="quoteBackBtn" onClick={clearSelection}>← Inbox</button>
                  <h2 className="quoteDetail__title">{selected.productTitle}</h2>
                  <p className="quoteDetail__sub">
                    {selected.rfqNumber || selected.rfqRef}
                    {selected.productCategory ? ` · ${selected.productCategory}` : ''}
                  </p>
                  {mode === 'buyer' && selected.rfqGroupId ? (
                    <Link to={`${basePath}/group/${selected.rfqGroupId}`} className="metricCard__link">
                      Open quotation comparison →
                    </Link>
                  ) : null}
                </div>
                <StatusBadge
                  status={selected.status}
                  expired={isQuoteExpired(selected)}
                  mode={mode}
                />
              </div>

              <div className="quoteDetail__grid">
                <QuotationTimeline request={selected} mode={mode} />
                <aside className="quoteSide panel">
                  <h3 className="quoteSide__title">Summary</h3>
                  <dl className="b2bRfqMeta">
                    <div><dt>RFQ number</dt><dd>{selected.rfqNumber || selected.rfqRef}</dd></div>
                    <div><dt>Status</dt><dd>{QUOTE_STATUS_LABELS[selected.status]}</dd></div>
                    <div><dt>Quantity</dt><dd>{selected.quantity}</dd></div>
                    <div><dt>Delivery location</dt><dd>{selected.deliveryLocation || '—'}</dd></div>
                    <div><dt>Expected delivery</dt><dd>{formatQuotationDate(selected.expectedDeliveryDate)}</dd></div>
                    {selected.targetPrice != null ? (
                      <div><dt>Indicative budget</dt><dd>{formatQuoteMoney(selected.targetPrice, selected.sellerCurrency || 'INR')}</dd></div>
                    ) : null}
                    {selected.sellerUnitPrice != null ? (
                      <div><dt>Final quotation</dt><dd>{formatQuoteMoney(selected.sellerUnitPrice, selected.sellerCurrency || 'INR')}</dd></div>
                    ) : null}
                    {mode === 'seller' ? (
                      <div>
                        <dt>Buyer</dt>
                        <dd><BuyerIdentity buyer={selected.buyer} buyerMarketplaceId={selected.buyerMarketplaceId} city={selected.buyerCity} compact showLabel /></dd>
                      </div>
                    ) : null}
                    {mode === 'buyer' ? (
                      <div>
                        <dt>Seller</dt>
                        <dd><SellerIdentity seller={selected.seller} sellerMarketplaceId={selected.sellerMarketplaceId} city={selected.sellerCity} compact showLabel /></dd>
                      </div>
                    ) : null}
                    {selected.order?.orderNumber ? (
                      <div><dt>Deal</dt><dd><Link to={mode === 'buyer' ? '/buyer/transactions' : '/seller/transactions'}>{selected.order.orderNumber}</Link></dd></div>
                    ) : null}
                  </dl>
                  <RfqAttachmentsList attachments={selected.attachments} />
                  {selected.revisions?.length ? (
                    <div className="quoteRevisionHistory">
                      <h4>Quotation revision history</h4>
                      <ol>
                        {selected.revisions.map((revision) => (
                          <li key={revision.id}>
                            v{revision.revisionNumber}: {formatQuoteMoney(revision.sellerUnitPrice, revision.sellerCurrency)}
                            {' · '}
                            valid until {formatQuotationDate(revision.quoteValidUntil)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </aside>
              </div>

              {mode === 'seller' && selected.status === 'NOT_SELECTED' ? (
                <div className="quoteLockedBanner panel">
                  <p className="quoteLockedCopy">
                    Not selected — the buyer accepted another seller&apos;s quotation for this RFQ group.
                  </p>
                </div>
              ) : null}
              {mode === 'seller' && (selected.status === 'PENDING' || selected.status === 'RESPONDED') && hasFullAccess ? (
                <SellerQuotationForm request={selected} onSubmitted={refreshAll} />
              ) : null}
              {mode === 'seller' && selected.status === 'PENDING' && !hasFullAccess ? (
                <div className="quoteLockedBanner panel">
                  <p className="quoteLockedCopy">Subscribe to send quotations.</p>
                  <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>Unlock seller quotations</button>
                </div>
              ) : null}
              {mode === 'buyer' && selected.status === 'PENDING' && hasFullAccess && isBuyerQuotationActionable(selected) ? (
                <BuyerPendingActions request={selected} onUpdated={refreshAll} />
              ) : null}
              {mode === 'buyer' && selected.status === 'RESPONDED' && hasFullAccess && isBuyerQuotationActionable(selected) ? (
                <BuyerActions request={selected} onUpdated={refreshAll} />
              ) : null}
              {mode === 'buyer' && (selected.status === 'RESPONDED' || selected.status === 'NOT_SELECTED') && (isQuoteExpired(selected) || selected.actionsLocked) && hasFullAccess ? (
                <div className="quoteLockedBanner panel">
                  <p className="quoteLockedCopy">
                    {selected.status === 'NOT_SELECTED' || selected.buyerDisplayStatus === 'EXPIRED'
                      ? 'This quotation is no longer available because you finalized another seller.'
                      : 'This quotation has expired.'}
                  </p>
                </div>
              ) : null}
              {mode === 'buyer' && selected.status === 'RESPONDED' && !hasFullAccess ? (
                <div className="quoteLockedBanner panel">
                  <p className="quoteLockedCopy">Subscribe to accept or reject quotations.</p>
                  <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>Unlock buyer quotations</button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <SubscribeFeatureAlert
        open={subscribeAlertOpen}
        title={`Subscribe to unlock ${mode} quotations`}
        message={`An active ${mode} subscription is required to respond, accept, or reject quotations.`}
        onClose={() => setSubscribeAlertOpen(false)}
        onSubscribe={() => { setSubscribeAlertOpen(false); navigate('/pricing') }}
      />
    </div>
  )
}
