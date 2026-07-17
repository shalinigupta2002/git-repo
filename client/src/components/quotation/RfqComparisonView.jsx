import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SellerIdentity } from '../common/SellerIdentity.jsx'
import { SubscribeFeatureAlert } from '../common/SubscribeFeatureAlert.jsx'
import { PageLoader } from '../ui/PageLoader.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import {
  acceptQuote,
  getRfqGroupComparison,
  rejectQuote,
} from '../../services/quoteRequest.service.js'
import {
  QUOTE_STATUS_BADGE,
  QUOTE_STATUS_LABELS,
  formatQuotationDate,
  formatQuoteMoney,
  getQuoteStatusDisplay,
  isBuyerQuotationActionable,
  isQuoteExpired,
} from '../../utils/quotationHelpers.js'
import { RfqAttachmentsList } from './RfqAttachmentsList.jsx'

function StatusBadge({ status, expired = false, mode = 'buyer' }) {
  const { label, badge } = getQuoteStatusDisplay(status, { expired, mode })
  return <span className={`b2bBadge ${badge}`}>{label}</span>
}

export function RfqComparisonView({ basePath = '/buyer/quotations' }) {
  const { rfqGroupId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [hasFullAccess, setHasFullAccess] = useState(true)
  const [group, setGroup] = useState(null)
  const [subscribeAlertOpen, setSubscribeAlertOpen] = useState(false)

  const loadGroup = useCallback(async () => {
    if (!rfqGroupId) return
    setLoading(true)
    try {
      const data = await getRfqGroupComparison(rfqGroupId)
      setGroup(data?.group || null)
      setHasFullAccess(Boolean(data?.hasFullAccess))
    } catch (error) {
      toast.error(error?.message || 'Failed to load RFQ comparison')
      setGroup(null)
    } finally {
      setLoading(false)
    }
  }, [rfqGroupId])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  async function handleAccept(quotationId) {
    if (!hasFullAccess) {
      setSubscribeAlertOpen(true)
      return
    }
    setBusyId(quotationId)
    try {
      const data = await acceptQuote(quotationId)
      toast.success('Quotation accepted.')
      await loadGroup()
      if (data?.order?.id) navigate('/buyer/transactions')
    } catch (error) {
      toast.error(error?.message || 'Could not accept quotation.')
    } finally {
      setBusyId('')
    }
  }

  async function handleReject(quotationId) {
    if (!hasFullAccess) {
      setSubscribeAlertOpen(true)
      return
    }
    setBusyId(quotationId)
    try {
      await rejectQuote(quotationId)
      toast.success('Quotation declined.')
      await loadGroup()
    } catch (error) {
      toast.error(error?.message || 'Could not decline quotation.')
    } finally {
      setBusyId('')
    }
  }

  if (loading) return <PageLoader label="Loading comparison" />

  if (!group) {
    return (
      <div className="quoteDetail__empty panel">
        <h2>RFQ group unavailable</h2>
        <Link to={basePath} className="btn btn--ghost">Back to RFQs</Link>
      </div>
    )
  }

  const comparison = group.comparison || group.quotations || []

  return (
    <div className="quoteWorkspace">
      <header className="quoteWorkspace__hero">
        <div>
          <button type="button" className="quoteBackBtn" onClick={() => navigate(basePath)}>
            ← My RFQs
          </button>
          <p className="quoteWorkspace__eyebrow">Quotation comparison</p>
          <h1 className="sellerDashboard__greeting">{group.productTitle}</h1>
          <p className="sellerDashboard__sub">
            {group.rfqNumber || group.rfqRef} · {group.sellerCount} seller{group.sellerCount === 1 ? '' : 's'}
          </p>
        </div>
        <StatusBadge status={group.aggregateStatus} expired={group.hasExpiredQuotation} />
      </header>

      <div className="quoteComparisonMeta panel">
        <dl className="b2bRfqMeta">
          <div>
            <dt>RFQ number</dt>
            <dd>{group.rfqNumber || group.rfqRef}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{group.quantity}</dd>
          </div>
          <div>
            <dt>Delivery location</dt>
            <dd>{group.deliveryLocation || '—'}</dd>
          </div>
          <div>
            <dt>Expected delivery</dt>
            <dd>{formatQuotationDate(group.expectedDeliveryDate)}</dd>
          </div>
          {group.targetPrice != null ? (
            <div>
              <dt>Indicative budget</dt>
              <dd>{formatQuoteMoney(group.targetPrice)}</dd>
            </div>
          ) : null}
        </dl>
        {group.message ? (
          <div className="quoteComparisonMeta__message">
            <strong>Requirement</strong>
            <p>{group.message}</p>
          </div>
        ) : null}
        <RfqAttachmentsList attachments={group.attachments} />
      </div>

      {!hasFullAccess ? (
        <div className="quoteLockedBanner panel">
          <p className="quoteLockedCopy">Subscribe to compare quotations and accept offers.</p>
          <button type="button" className="btn btn--primary" onClick={() => setSubscribeAlertOpen(true)}>
            View plans
          </button>
        </div>
      ) : null}

      <div className="quoteComparisonTableWrap panel">
        <table className="quoteComparisonTable">
          <thead>
            <tr>
              <th>Seller ID</th>
              <th>Seller city</th>
              <th>Price</th>
              <th>Delivery time</th>
              <th>Validity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => {
              const quotationId = row.quotationId || row.id
              const status = row.status
              const expired = row.expired || row.buyerDisplayStatus === 'EXPIRED' || (
                status === 'RESPONDED' && (
                  (row.validity && new Date() > new Date(row.validity))
                  || isQuoteExpired({ quoteValidUntil: row.validity || row.quoteValidUntil })
                )
              ) || status === 'NOT_SELECTED'
              const canAct = hasFullAccess
                && status === 'RESPONDED'
                && !expired
                && !row.actionsLocked
                && isBuyerQuotationActionable({ status, expired, actionsLocked: row.actionsLocked })
              return (
                <tr key={quotationId}>
                  <td><code>{row.sellerMarketplaceId || row.seller?.marketplaceId || '—'}</code></td>
                  <td>{row.sellerCity || '—'}</td>
                  <td>{formatQuoteMoney(row.finalUnitPrice || row.sellerUnitPrice, row.currency || row.sellerCurrency || 'INR')}</td>
                  <td>{row.deliveryTime || row.freightNote || '—'}</td>
                  <td>{formatQuotationDate(row.validity || row.quoteValidUntil)}</td>
                  <td><StatusBadge status={status} expired={expired} /></td>
                  <td>
                    {canAct ? (
                      <div className="quoteComparisonTable__actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={Boolean(busyId)}
                          onClick={() => handleAccept(quotationId)}
                        >
                          {busyId === quotationId ? <Spinner size="sm" /> : 'Accept'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={Boolean(busyId)}
                          onClick={() => handleReject(quotationId)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="panelSub">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!comparison.length ? (
          <p className="quoteInbox__empty">No seller quotations yet.</p>
        ) : null}
      </div>

      <SubscribeFeatureAlert
        open={subscribeAlertOpen}
        title="Subscribe to compare quotations"
        message="An active buyer subscription is required to accept or reject quotations."
        onClose={() => setSubscribeAlertOpen(false)}
        onSubscribe={() => {
          setSubscribeAlertOpen(false)
          navigate('/pricing')
        }}
      />
    </div>
  )
}
