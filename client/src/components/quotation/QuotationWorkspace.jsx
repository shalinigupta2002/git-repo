import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SellerIdentity, BuyerIdentity } from '../common/SellerIdentity.jsx'
import { SubscribeFeatureAlert } from '../common/SubscribeFeatureAlert.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import './rfqWorkspace.css'
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
  QUOTE_STATUS_LABELS,
  formatQuotationDate,
  formatQuoteMoney,
  getQuoteStatusDisplay,
  isBuyerQuotationActionable,
  isQuoteExpired,
  quoteLineTotal,
} from '../../utils/quotationHelpers.js'
import { BackNavButton } from '../common/BackNavButton.jsx'
import { InlineRfqComparison } from './InlineRfqComparison.jsx'
import { AcceptConfirmModal, OrderCreatedModal } from './AcceptQuotationModals.jsx'
import { RfqAttachmentsList } from './RfqAttachmentsList.jsx'

const BUYER_FILTERS = [
  { id: 'all', label: 'My RFQs' },
  { id: 'PENDING', label: 'Waiting For Seller' },
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

const BUYER_EMPTY_MESSAGES = {
  all: { title: 'No RFQs Yet', desc: 'Browse products and send your first quotation request.' },
  PENDING: { title: 'No RFQs Waiting For Seller', desc: 'All active RFQs have received seller responses or are closed.' },
  RESPONDED: { title: 'No Seller Quotations Yet', desc: 'Waiting for sellers to respond to your RFQs.' },
  ACCEPTED: { title: 'No Accepted Quotations', desc: 'Accepted seller quotations will appear here.' },
  DECLINED: { title: 'No Rejected Quotations', desc: 'Quotations you reject will appear here.' },
  CANCELLED: { title: 'No Cancelled RFQs', desc: 'Cancelled RFQ requests will appear here.' },
  expired: { title: 'No Expired Quotations', desc: 'Expired seller quotations will appear here.' },
}

const DEFAULT_BUYER_STATS = {
  myRfqs: 0,
  pending: 0,
  sellerResponses: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
  expired: 0,
}

const DEFAULT_SELLER_STATS = {
  incoming: 0,
  pendingResponses: 0,
  responded: 0,
  acceptedDeals: 0,
  rejected: 0,
  expired: 0,
}

const BUYER_STAT_CARDS = [
  { id: 'all', label: 'Total RFQs', key: 'myRfqs', tone: 'blue', icon: 'folder' },
  { id: 'PENDING', label: 'Waiting', key: 'pending', tone: 'amber', icon: 'clock' },
  { id: 'RESPONDED', label: 'Responses', key: 'sellerResponses', tone: 'violet', icon: 'inbox' },
  { id: 'ACCEPTED', label: 'Accepted', key: 'accepted', tone: 'green', icon: 'check' },
  { id: 'DECLINED', label: 'Rejected', key: 'rejected', tone: 'rose', icon: 'x' },
  { id: 'CANCELLED', label: 'Cancelled', key: 'cancelled', tone: 'slate', icon: 'ban' },
  { id: 'expired', label: 'Expired', key: 'expired', tone: 'orange', icon: 'alert' },
]

function StatCardIcon({ name }) {
  const icons = {
    folder: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h5l2 2h11v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2M12 22a10 10 0 110-20 10 10 0 010 20z" />,
    inbox: <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0H4" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M10 10l4 4m0-4l-4 4M12 22a10 10 0 110-20 10 10 0 010 20z" />,
    ban: <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 8v4" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {icons[name] || icons.folder}
    </svg>
  )
}

function RfqSummaryCards({ stats, activeFilter, onFilterChange, mode }) {
  if (mode !== 'buyer') return null
  const data = stats || DEFAULT_BUYER_STATS

  return (
    <div className="rfqWsStats" role="group" aria-label="RFQ summary">
      {BUYER_STAT_CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`rfqWsStatCard${activeFilter === card.id ? ' rfqWsStatCard--active' : ''}`}
          onClick={() => onFilterChange(card.id)}
        >
          <span className={`rfqWsStatCard__icon rfqWsStatCard__icon--${card.tone}`}>
            <StatCardIcon name={card.icon} />
          </span>
          <span>
            <span className="rfqWsStatCard__value">{data[card.key] ?? 0}</span>
            <span className="rfqWsStatCard__label">{card.label}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rfqWsCollapse">
      <button
        type="button"
        className="rfqWsCollapse__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg className={`rfqWsCollapse__chevron${open ? ' rfqWsCollapse__chevron--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? <div className="rfqWsCollapse__body">{children}</div> : null}
    </div>
  )
}

function RfqProgressSteps({ status, hasOrder = false }) {
  const steps = [
    { label: 'RFQ Sent', done: true },
    { label: 'Seller Quoted', done: ['RESPONDED', 'ACCEPTED', 'DECLINED', 'NOT_SELECTED'].includes(status) },
    { label: 'Accepted', done: status === 'ACCEPTED' || hasOrder },
    { label: 'Order Created', done: hasOrder },
  ]
  const activeIndex = steps.findIndex((step) => !step.done)
  const currentIndex = activeIndex === -1 ? steps.length - 1 : activeIndex

  return (
    <ol className="rfqWsProgress">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={[
            'rfqWsProgress__step',
            step.done ? 'rfqWsProgress__step--done' : '',
            index === currentIndex && !step.done ? 'rfqWsProgress__step--current' : '',
          ].filter(Boolean).join(' ')}
        >
          <span className="rfqWsProgress__dot" aria-hidden />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

function RecentActivity({ subject, selected }) {
  const events = []

  if (subject?.createdAt) {
    events.push({ text: 'RFQ submitted', time: subject.createdAt })
  }
  if (selected?.sellerRespondedAt) {
    events.push({ text: 'Seller sent quotation', time: selected.sellerRespondedAt })
  } else if (selected?.status === 'RESPONDED' && selected?.updatedAt) {
    events.push({ text: 'Seller quotation received', time: selected.updatedAt })
  }
  if (selected?.status === 'ACCEPTED') {
    events.push({ text: 'Quotation accepted', time: selected.updatedAt || selected.createdAt })
  }
  if (selected?.order?.orderNumber) {
    events.push({ text: `Order ${selected.order.orderNumber} created`, time: selected.updatedAt })
  }
  if (selected?.status === 'DECLINED') {
    events.push({ text: 'Quotation rejected', time: selected.updatedAt })
  }
  if (selected?.status === 'CANCELLED') {
    events.push({ text: 'RFQ cancelled', time: selected.updatedAt })
  }

  if (!events.length) {
    return <p className="rfqWsNextAction__text">Activity will appear here as your RFQ progresses.</p>
  }

  return (
    <ul className="rfqWsActivity">
      {events.map((event) => (
        <li key={`${event.text}-${event.time}`} className="rfqWsActivity__item">
          <p className="rfqWsActivity__text">{event.text}</p>
          <p className="rfqWsActivity__time">{formatQuotationDate(event.time)}</p>
        </li>
      ))}
    </ul>
  )
}

function RfqSidebarPanel({ mode, selected, activeGroup, rfqGroupId }) {
  if (mode !== 'buyer') return null

  const subject = selected || activeGroup
  if (!subject) {
    return (
      <aside className="rfqWsSidebar">
        <div className="rfqWsSidebar__unified rfqWs__card">
          <h3 className="rfqWsSidebar__title">Deal overview</h3>
          <p className="rfqWsNextAction__text">Select an RFQ to view summary, progress, and next steps.</p>
        </div>
      </aside>
    )
  }

  const status = selected?.status || activeGroup?.aggregateStatus
  const hasOrder = Boolean(selected?.order?.orderNumber)
  const currency = selected?.sellerCurrency || 'INR'

  return (
    <aside className="rfqWsSidebar">
      <div className="rfqWsSidebar__unified rfqWs__card">
        <h3 className="rfqWsSidebar__title">Deal overview</h3>
        <dl>
          <div className="rfqWsSidebar__row"><dt>Product</dt><dd>{selected?.productTitle || activeGroup?.productTitle}</dd></div>
          {(selected?.rfqNumber || selected?.rfqRef || activeGroup?.rfqNumber || activeGroup?.rfqRef) ? (
            <div className="rfqWsSidebar__row"><dt>RFQ</dt><dd>{selected?.rfqNumber || selected?.rfqRef || activeGroup?.rfqNumber || activeGroup?.rfqRef}</dd></div>
          ) : null}
          {status ? (
            <div className="rfqWsSidebar__row"><dt>Status</dt><dd>{QUOTE_STATUS_LABELS[status] || status}</dd></div>
          ) : null}
          {(selected?.quantity || activeGroup?.quantity) ? (
            <div className="rfqWsSidebar__row"><dt>Quantity</dt><dd>{selected?.quantity || activeGroup?.quantity}</dd></div>
          ) : null}
          {selected?.seller ? (
            <div className="rfqWsSidebar__row">
              <dt>Seller</dt>
              <dd><SellerIdentity seller={selected.seller} sellerMarketplaceId={selected.sellerMarketplaceId} city={selected.sellerCity} compact showLabel /></dd>
            </div>
          ) : activeGroup?.sellerCount ? (
            <div className="rfqWsSidebar__row"><dt>Sellers</dt><dd>{activeGroup.sellerCount}</dd></div>
          ) : null}
          {selected?.sellerUnitPrice != null ? (
            <div className="rfqWsSidebar__row"><dt>Quoted price</dt><dd>{formatQuoteMoney(selected.sellerUnitPrice, currency)}</dd></div>
          ) : null}
          <div className="rfqWsSidebar__row">
            <dt>Deal charge</dt>
            <dd>{hasOrder ? 'Pay from My Orders' : 'At order creation'}</dd>
          </div>
        </dl>

        <div className="rfqWsSidebar__divider" />
        <p className="rfqWsSidebar__sectionLabel">Progress</p>
        <RfqProgressSteps status={status} hasOrder={hasOrder} />

        <div className="rfqWsSidebar__divider" />
        <p className="rfqWsSidebar__sectionLabel">Next action</p>
        {selected?.status === 'RESPONDED' && isBuyerQuotationActionable(selected) ? (
          <p className="rfqWsNextAction__text">Review quotations and accept one offer to create your order.</p>
        ) : selected?.status === 'PENDING' ? (
          <p className="rfqWsNextAction__text">Waiting for seller response. Cancel if you no longer need this RFQ.</p>
        ) : selected?.status === 'ACCEPTED' || hasOrder ? (
          <Link to="/buyer/deals" className="btn btn--primary rfqWsSidebar__cta">Go to My Orders</Link>
        ) : rfqGroupId ? (
          <p className="rfqWsNextAction__text">Compare seller quotations and accept the best offer.</p>
        ) : (
          <p className="rfqWsNextAction__text">Select an RFQ from the list to continue.</p>
        )}
      </div>

      <CollapsibleSection title="Recent activity" defaultOpen={false}>
        <RecentActivity subject={subject} selected={selected} />
      </CollapsibleSection>
    </aside>
  )
}

function ProductHero({ request, statusBadge, nav, subtitle }) {
  if (!request) return null
  const currency = request.sellerCurrency || 'INR'

  return (
    <section className="rfqWsHero rfqWs__card">
      {nav}
      <div className="rfqWsHero__head">
        <div>
          <p className="rfqWsHero__eyebrow">{request.rfqNumber || request.rfqRef}</p>
          <h2 className="rfqWsHero__title">{request.productTitle}</h2>
          {subtitle ? <p className="rfqWsHero__sub">{subtitle}</p> : null}
          <dl className="rfqWsHero__meta">
            <div className="rfqWsHero__metaItem"><dt>Quantity</dt><dd>{request.quantity}</dd></div>
            <div className="rfqWsHero__metaItem"><dt>Delivery</dt><dd>{request.deliveryLocation || '—'}</dd></div>
            <div className="rfqWsHero__metaItem"><dt>Expected</dt><dd>{formatQuotationDate(request.expectedDeliveryDate)}</dd></div>
            {request.targetPrice != null ? (
              <div className="rfqWsHero__metaItem"><dt>Budget</dt><dd>{formatQuoteMoney(request.targetPrice, currency)}</dd></div>
            ) : null}
            {request.sellerUnitPrice != null ? (
              <div className="rfqWsHero__metaItem"><dt>Quoted</dt><dd>{formatQuoteMoney(request.sellerUnitPrice, currency)}</dd></div>
            ) : null}
          </dl>
        </div>
        {statusBadge}
      </div>
    </section>
  )
}

function ProductSummaryCard({ request, statusBadge, nav }) {
  return <ProductHero request={request} statusBadge={statusBadge} nav={nav} />
}

function RequirementCard({ request }) {
  if (!request) return null
  const currency = request.sellerCurrency || 'INR'

  return (
    <CollapsibleSection title="Requirement details" defaultOpen={false}>
      <div className="rfqWsRequirement">{request.message || 'No requirement provided.'}</div>
      <dl className="rfqWsMetaGrid" style={{ marginTop: 16 }}>
        <div><dt>Quantity</dt><dd>{request.quantity}</dd></div>
        <div><dt>Delivery</dt><dd>{request.deliveryLocation || '—'}</dd></div>
        <div><dt>Expected</dt><dd>{formatQuotationDate(request.expectedDeliveryDate)}</dd></div>
        {request.targetPrice != null ? (
          <div><dt>Budget</dt><dd>{formatQuoteMoney(request.targetPrice, currency)}</dd></div>
        ) : null}
      </dl>
      <RfqAttachmentsList attachments={request.attachments} />
    </CollapsibleSection>
  )
}

function TimelineStrip({ request }) {
  const steps = [
    { label: 'RFQ sent', done: true, current: request?.status === 'PENDING', date: request?.createdAt },
    {
      label: 'Seller quoted',
      done: request?.status !== 'PENDING',
      current: request?.status === 'RESPONDED',
      date: request?.sellerRespondedAt || request?.updatedAt,
    },
    {
      label: 'Accepted',
      done: request?.status === 'ACCEPTED',
      current: request?.status === 'ACCEPTED' && !request?.order?.orderNumber,
      date: request?.status === 'ACCEPTED' ? request?.updatedAt : null,
    },
    {
      label: 'Order created',
      done: Boolean(request?.order?.orderNumber),
      current: Boolean(request?.order?.orderNumber),
      date: request?.order?.orderNumber ? request?.updatedAt : null,
    },
  ]

  return (
    <section className="rfqWsBlock rfqWs__card rfqWs__card--flat">
      <h3 className="rfqWsBlock__title">Timeline</h3>
      <div className="rfqWsStrip">
        {steps.map((step) => (
          <div
            key={step.label}
            className={[
              'rfqWsStrip__step',
              step.done ? 'rfqWsStrip__step--done' : '',
              step.current ? 'rfqWsStrip__step--current' : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="rfqWsStrip__dot" aria-hidden />
            <p className="rfqWsStrip__label">{step.label}</p>
            {step.date ? <p className="rfqWsStrip__date">{formatQuotationDate(step.date)}</p> : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function QuotationTimeline({ request }) {
  return <TimelineStrip request={request} />
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
    <div className="rfqWsBlock rfqWs__card quoteRespond">
      <h3 className="rfqWsBlock__title">
        {request?.status === 'RESPONDED' ? 'Revise quotation' : 'Send quotation'}
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
    <div className="rfqWsBlock rfqWs__card quoteBuyerActions">
      <h3 className="rfqWsBlock__title">Pending seller response</h3>
      <div className="rfqWsActions">
        <button type="button" className="btn btn--ghost" disabled={Boolean(busy)} onClick={handleCancel}>
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel RFQ'}
        </button>
      </div>
    </div>
  )
}

function BuyerActions({ request, onUpdated, onAccepted }) {
  const [busy, setBusy] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successPayload, setSuccessPayload] = useState(null)
  const expired = isQuoteExpired(request)
  const actionable = isBuyerQuotationActionable(request)

  async function executeAccept() {
    setBusy('accept')
    try {
      const data = await acceptQuote(request.id)
      setConfirmOpen(false)
      setSuccessPayload(data)
      onUpdated?.(data?.request)
      onAccepted?.(data)
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
      toast.success('Quotation rejected.')
      onUpdated?.()
    } catch (error) {
      toast.error(error?.message || 'Could not reject quotation.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <div className="rfqWsBlock rfqWs__card quoteBuyerActions">
        <h3 className="rfqWsBlock__title">Review quotation</h3>
        {expired || !actionable ? (
          <p className="rfqWsNextAction__text">
            {request?.status === 'NOT_SELECTED' || request?.buyerDisplayStatus === 'EXPIRED'
              ? 'This quotation is no longer available because you finalized another seller.'
              : 'This quotation has expired. Request a new RFQ from the seller.'}
          </p>
        ) : (
          <div className="rfqWsActions">
            <button type="button" className="btn btn--primary" disabled={Boolean(busy)} onClick={() => setConfirmOpen(true)}>
              {busy === 'accept' ? 'Accepting…' : 'Accept Quotation'}
            </button>
            <button type="button" className="btn btn--ghost" disabled={Boolean(busy)} onClick={handleReject}>
              {busy === 'reject' ? 'Rejecting…' : 'Reject Quotation'}
            </button>
          </div>
        )}
      </div>

      <AcceptConfirmModal
        open={confirmOpen}
        request={request}
        busy={busy === 'accept'}
        onConfirm={executeAccept}
        onCancel={() => setConfirmOpen(false)}
      />

      <OrderCreatedModal
        open={Boolean(successPayload)}
        order={successPayload?.order}
        deal={successPayload?.deal}
        onGoToOrders={() => {
          setSuccessPayload(null)
          window.location.href = '/buyer/deals'
        }}
      />
    </>
  )
}

export function QuotationWorkspace({ mode, basePath }) {
  const { requestId, rfqGroupId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const tabParam = searchParams.get('tab')

  const [groups, setGroups] = useState([])
  const [requests, setRequests] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 })
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [listError, setListError] = useState('')
  const [filter, setFilter] = useState(() => {
    if (tabParam === 'quotations') return 'RESPONDED'
    return 'all'
  })
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [dateSort, setDateSort] = useState('newest')
  const [subscribeAlertOpen, setSubscribeAlertOpen] = useState(false)
  const { unreadCount } = useRfqNotifications({ enabled: hasFullAccess })

  const viewAs = mode
  const filters = mode === 'buyer' ? BUYER_FILTERS : SELLER_FILTERS

  useEffect(() => {
    if (tabParam !== 'quotations') return
    setFilter('RESPONDED')
    setPage(1)
    navigate(basePath, { replace: true })
  }, [tabParam, basePath, navigate])

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

  function handleFilterChange(nextFilter) {
    setFilter(nextFilter)
    setPage(1)
    if (requestId || rfqGroupId) {
      navigate(basePath)
    }
  }

  function getEmptyMessage() {
    if (mode !== 'buyer') {
      return { title: 'No RFQs Yet', desc: 'Buyer RFQs will appear here when they request quotations.' }
    }
    return BUYER_EMPTY_MESSAGES[filter] || BUYER_EMPTY_MESSAGES.all
  }

  const inboxCount = pagination.total
  const activeGroup = rfqGroupId ? groups.find((group) => group.rfqGroupId === rfqGroupId) : null

  const sortedGroups = useMemo(() => {
    const copy = [...groups]
    copy.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      return dateSort === 'oldest' ? aTime - bTime : bTime - aTime
    })
    return copy
  }, [groups, dateSort])

  const sortedRequests = useMemo(() => {
    const copy = [...requests]
    copy.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      return dateSort === 'oldest' ? aTime - bTime : bTime - aTime
    })
    return copy
  }, [requests, dateSort])

  function selectBuyerGroup(group) {
    navigate(`${basePath}/group/${group.rfqGroupId}`)
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

  const pageTitle = mode === 'buyer' ? 'RFQs & Quotations' : 'Incoming RFQs'

  function renderListSkeleton() {
    return (
      <div className="rfqWsSkeleton">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="rfqWsSkeleton__bar" style={{ width: `${70 - idx * 10}%` }} />
        ))}
      </div>
    )
  }

  function renderBuyerListItem(group) {
    return (
      <li key={group.rfqGroupId}>
        <button
          type="button"
          className={`rfqWsListItem${rfqGroupId === group.rfqGroupId ? ' rfqWsListItem--active' : ''}`}
          onClick={() => selectBuyerGroup(group)}
        >
          <span className="rfqWsListItem__row">
            <span className="rfqWsListItem__name">{group.productTitle}</span>
            <StatusBadge status={group.aggregateStatus} expired={group.hasExpiredQuotation} mode={mode} />
          </span>
          <span className="rfqWsListItem__rfq">{group.rfqNumber || group.rfqRef}</span>
          <span className="rfqWsListItem__date">{formatQuotationDate(group.createdAt)}</span>
        </button>
      </li>
    )
  }

  function renderSellerListItem(item) {
    const active = item.id === requestId
    const expired = item.status === 'RESPONDED' && isQuoteExpired(item)
    return (
      <li key={item.id}>
        <button
          type="button"
          className={`rfqWsListItem${active ? ' rfqWsListItem--active' : ''}`}
          onClick={() => selectRequest(item.id)}
        >
          <span className="rfqWsListItem__row">
            <span className="rfqWsListItem__name">{item.productTitle}</span>
            <StatusBadge status={item.status} expired={expired} mode={mode} />
          </span>
          <span className="rfqWsListItem__rfq">{item.rfqNumber || item.rfqRef}</span>
          <span className="rfqWsListItem__date">{formatQuotationDate(item.createdAt)}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="rfqWs" data-testid="quotation-workspace">
      <header className="rfqWsHeader">
        <div className="rfqWsHeader__top">
          <div>
            <h1 className="rfqWsHeader__title">{pageTitle}</h1>
            <p className="rfqWsHeader__desc">
              {mode === 'buyer'
                ? 'Create RFQs, compare seller quotations, accept offers, and track every status in one workspace.'
                : 'Review buyer RFQs and respond with final quotations from a single dashboard.'}
            </p>
          </div>
          <div className="rfqWsHeader__actions">
            {mode === 'buyer' ? (
              <Link to="/products" className="btn btn--primary">Create RFQ</Link>
            ) : (
              <Link to="/seller/products" className="btn btn--ghost">View listings</Link>
            )}
          </div>
        </div>

        <div className="rfqWsHeader__toolbar">
          <div className="rfqWsSearch">
            <svg className="rfqWsSearch__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input
              type="search"
              className="rfqWsSearch__input"
              placeholder="Search RFQs by product, RFQ number…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {mode === 'seller' ? (
            <div className="rfqWsQuickFilters">
              {filters.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rfqWsQuickFilter${filter === item.id ? ' rfqWsQuickFilter--active' : ''}`}
                  onClick={() => handleFilterChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <RfqSummaryCards stats={stats} activeFilter={filter} onFilterChange={handleFilterChange} mode={mode} />
      </header>

      {!hasFullAccess ? (
        <div className="rfqWsBanner">
          <div>
            <strong>Subscribe to unlock full quotation tools.</strong>
            <p>You can preview requests, but responding, accepting quotations, and viewing counterpart details require an active {mode} plan.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>View plans</button>
        </div>
      ) : null}

      <div className={`rfqWsMain${mode !== 'buyer' ? ' rfqWsMain--twoCol' : ''}`}>
        <aside className="rfqWsList rfqWs__card" data-testid="quotation-workspace-list">
          <div className="rfqWsList__head">
            <div className="rfqWsList__titleRow">
              <h2 className="rfqWsList__title">RFQ List{unreadCount ? ` · ${unreadCount} new` : ''}</h2>
              <span className="rfqWsList__badge">{inboxCount}</span>
            </div>
          </div>

          <div className="rfqWsList__filters">
            <select
              className="rfqWsSelect"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              aria-label="Status filter"
            >
              {filters.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <select
              className="rfqWsSelect"
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value)}
              aria-label="Date sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {loadingList ? renderListSkeleton() : listError ? (
            <div className="rfqWsList__empty" role="alert"><p>{listError}</p></div>
          ) : mode === 'buyer' ? (
            sortedGroups.length === 0 ? (
              <div className="rfqWsList__empty">
                <h3>{getEmptyMessage().title}</h3>
                <p>{getEmptyMessage().desc}</p>
                {filter === 'all' ? <Link to="/products" className="btn btn--primary">Browse Products</Link> : null}
              </div>
            ) : (
              <>
                <ul className="rfqWsList__scroll">{sortedGroups.map(renderBuyerListItem)}</ul>
                {pagination.totalPages > 1 ? (
                  <div className="rfqWsList__pagination">
                    <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button type="button" className="btn btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                ) : null}
              </>
            )
          ) : sortedRequests.length === 0 ? (
            <div className="rfqWsList__empty">
              <h3>{getEmptyMessage().title}</h3>
              <p>{getEmptyMessage().desc}</p>
            </div>
          ) : (
            <>
              <ul className="rfqWsList__scroll">{sortedRequests.map(renderSellerListItem)}</ul>
              {pagination.totalPages > 1 ? (
                <div className="rfqWsList__pagination">
                  <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {pagination.page} of {pagination.totalPages}</span>
                  <button type="button" className="btn btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              ) : null}
            </>
          )}
        </aside>

        <section className="rfqWsCenter">
          {mode === 'buyer' && rfqGroupId ? (
            <InlineRfqComparison
              rfqGroupId={rfqGroupId}
              hasFullAccess={hasFullAccess}
              onSubscribeRequired={() => setSubscribeAlertOpen(true)}
              onBack={clearSelection}
            />
          ) : !requestId ? (
            <div className="rfqWsCenter__empty rfqWs__card">
              <div className="rfqWsEmptyIcon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2>Select an RFQ</h2>
              <p>Choose a request from the left panel to view product details, compare sellers, and take action.</p>
              {mode === 'buyer' ? <Link to="/products" className="btn btn--primary">Create RFQ</Link> : null}
            </div>
          ) : loadingDetail ? (
            <div className="rfqWs__card rfqWsSkeleton">{renderListSkeleton()}</div>
          ) : !selected ? (
            <div className="rfqWsCenter__empty rfqWs__card">
              <h2>RFQ unavailable</h2>
              <button type="button" className="btn btn--ghost" onClick={clearSelection}>Back to list</button>
            </div>
          ) : (
            <>
              {mode === 'buyer' ? (
                <>
                  <ProductSummaryCard
                    request={selected}
                    statusBadge={<StatusBadge status={selected.status} expired={isQuoteExpired(selected)} mode={mode} />}
                    nav={(
                      <div className="rfqWsCenter__nav">
                        <BackNavButton fallback="/buyer/dashboard" label="← Back" className="rfqWsCenter__navBtn" />
                        <button type="button" className="rfqWsCenter__navBtn" onClick={clearSelection}>← RFQ list</button>
                      </div>
                    )}
                  />
                  <RequirementCard request={selected} />
                  <QuotationTimeline request={selected} />
                </>
              ) : (
                <>
                  <ProductHero
                    request={selected}
                    statusBadge={<StatusBadge status={selected.status} expired={isQuoteExpired(selected)} mode={mode} />}
                    nav={(
                      <div className="rfqWsCenter__nav">
                        <BackNavButton fallback="/seller/dashboard" label="← Back" className="rfqWsCenter__navBtn" />
                        <button type="button" className="rfqWsCenter__navBtn" onClick={clearSelection}>← RFQ list</button>
                      </div>
                    )}
                  />
                  <QuotationTimeline request={selected} />
                  <CollapsibleSection title="Buyer details" defaultOpen={false}>
                    <dl className="rfqWsMetaGrid">
                      <div><dt>Buyer</dt><dd><BuyerIdentity buyer={selected.buyer} buyerMarketplaceId={selected.buyerMarketplaceId} city={selected.buyerCity} compact showLabel /></dd></div>
                      <div><dt>Requirement</dt><dd>{selected.message || '—'}</dd></div>
                      {selected.targetPrice != null ? (
                        <div><dt>Budget</dt><dd>{formatQuoteMoney(selected.targetPrice, selected.sellerCurrency || 'INR')}</dd></div>
                      ) : null}
                      {selected.order?.orderNumber ? (
                        <div><dt>Order</dt><dd><Link to="/seller/deals">{selected.order.orderNumber}</Link></dd></div>
                      ) : null}
                    </dl>
                    <RfqAttachmentsList attachments={selected.attachments} />
                    {selected.revisions?.length ? (
                      <div className="quoteRevisionHistory" style={{ marginTop: 16 }}>
                        <h4>Revision history</h4>
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
                  </CollapsibleSection>
                </>
              )}

              {mode === 'seller' && selected.status === 'NOT_SELECTED' ? (
                <div className="rfqWsBanner quoteLockedBanner">
                  <p>Not selected — the buyer accepted another seller&apos;s quotation for this RFQ group.</p>
                </div>
              ) : null}
              {mode === 'seller' && (selected.status === 'PENDING' || selected.status === 'RESPONDED') && hasFullAccess ? (
                <SellerQuotationForm request={selected} onSubmitted={refreshAll} />
              ) : null}
              {mode === 'seller' && selected.status === 'PENDING' && !hasFullAccess ? (
                <div className="rfqWsBanner">
                  <p>Subscribe to send quotations.</p>
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
                <div className="rfqWsBanner">
                  <p>{selected.status === 'NOT_SELECTED' || selected.buyerDisplayStatus === 'EXPIRED'
                    ? 'This quotation is no longer available because you finalized another seller.'
                    : 'This quotation has expired.'}</p>
                </div>
              ) : null}
              {mode === 'buyer' && selected.status === 'RESPONDED' && !hasFullAccess ? (
                <div className="rfqWsBanner">
                  <p>Subscribe to accept or reject quotations.</p>
                  <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>Unlock buyer quotations</button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <RfqSidebarPanel mode={mode} selected={selected} activeGroup={activeGroup} rfqGroupId={rfqGroupId} />
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
