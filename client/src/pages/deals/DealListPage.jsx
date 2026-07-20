import { Link } from 'react-router-dom'
import { DealCard } from '../../components/deals/DealCard.jsx'
import { DealListAction } from '../../components/deals/DealListAction.jsx'
import { DealListFilters } from '../../components/deals/DealListFilters.jsx'
import { DealListSkeleton } from '../../components/deals/LoadingSkeleton.jsx'
import { DealStatusBadge } from '../../components/deals/DealStatusBadge.jsx'
import { EmptyState } from '../../components/common/EmptyState.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { useDeals } from '../../hooks/useDeals.js'
import {
  formatDealAmount,
  formatDealDate,
  getCounterparty,
  getCounterpartyCity,
  getMyDealCharge,
  UNLOCKED_INFO_NOTICE,
} from '../../utils/dealHelpers.js'

export function DealListPage({
  role,
  title,
  subtitle,
  detailBasePath,
  emptyAction,
  showAdminFilters = false,
}) {
  const {
    deals,
    pagination,
    filters,
    loading,
    error,
    load,
    updateFilters,
    resetFilters,
  } = useDeals(role, showAdminFilters ? {} : undefined)

  const counterpartyLabel = role === 'BUYER' ? 'Seller ID' : role === 'SELLER' ? 'Buyer ID' : 'Parties'
  const chargeLabel = role === 'ADMIN' ? 'Charges' : 'Platform Deal Charge'

  return (
    <section className="panel dealPage" data-testid="deal-list-page">
      <div className="panelHeader">
        <div>
          <h2 className="panelTitle">{title}</h2>
          <p className="panelSub">
            {subtitle}
            {!loading && pagination.total
              ? ` · ${pagination.total} deal${pagination.total === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
        <button type="button" className="btnOutline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {role === 'BUYER' ? (
        <div className="offlineNoticeCard" style={{ marginBottom: 20 }}>
          <svg className="offlineNoticeCard__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="offlineNoticeCard__title">{UNLOCKED_INFO_NOTICE.TITLE}</h4>
            <p className="offlineNoticeCard__desc">
              {UNLOCKED_INFO_NOTICE.DESC}
            </p>
          </div>
        </div>
      ) : null}

      <DealListFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        showAdminFilters={showAdminFilters}
        loading={loading}
      />

      {error ? (
        <ErrorState
          title="Could not load orders"
          message={error}
          onRetry={load}
        />
      ) : null}

      {loading ? <DealListSkeleton rows={5} /> : null}

      {!loading && !error && !deals.length ? (
        <EmptyState
          icon="🤝"
          title="No orders yet"
          description="Accepted quotations will appear here as orders."
          action={emptyAction}
        />
      ) : null}

      {!loading && !error && deals.length ? (
        <>
          <div className="dealCardsGrid">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                viewerRole={role}
                detailPath={`${detailBasePath}/${deal.id}`}
              />
            ))}
          </div>

          <div className="tableWrap dealTableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{role === 'BUYER' ? 'Order #' : 'Deal #'}</th>
                  <th>Product</th>
                  {showAdminFilters ? (
                    <>
                      <th>Buyer</th>
                      <th>Seller</th>
                    </>
                  ) : (
                    <>
                      <th>{counterpartyLabel}</th>
                      <th>City</th>
                    </>
                  )}
                  <th>Amount</th>
                  <th>{chargeLabel}</th>
                  <th>Contact Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const counterparty = getCounterparty(deal, role)
                  const city = getCounterpartyCity(counterparty)
                  const charge = getMyDealCharge(deal, role)

                  return (
                    <tr key={deal.id}>
                      <td><code>{deal.dealNumber}</code></td>
                      <td>{deal.product?.productName || '—'}</td>
                      {showAdminFilters ? (
                        <>
                          <td>{deal.buyer?.portalUserId || '—'}</td>
                          <td>{deal.seller?.portalUserId || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>{counterparty?.portalUserId || '—'}</td>
                          <td>{city || '—'}</td>
                        </>
                      )}
                      <td>{formatDealAmount(deal.totalAmount, deal.currency)}</td>
                      <td>{formatDealAmount(charge, deal.currency)}</td>
                      <td><DealStatusBadge status={deal.status} /></td>
                      <td>{formatDealDate(deal.createdAt)}</td>
                      <td>
                        <DealListAction
                          deal={deal}
                          viewerRole={role}
                          detailPath={`${detailBasePath}/${deal.id}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="dealPagination">
            <button
              type="button"
              className="btnOutline"
              disabled={loading || pagination.page <= 1}
              onClick={() => updateFilters({ page: Math.max(1, pagination.page - 1) })}
            >
              Previous
            </button>
            <span>
              Page {pagination.page || filters.page} of {Math.max(pagination.totalPages || 1, 1)}
            </span>
            <button
              type="button"
              className="btnOutline"
              disabled={loading || pagination.page >= (pagination.totalPages || 1)}
              onClick={() => updateFilters({ page: (pagination.page || 1) + 1 })}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
