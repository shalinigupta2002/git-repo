import { DEAL_SORT_OPTIONS } from '../../utils/dealHelpers.js'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'QUOTATION_ACCEPTED', label: 'Quotation accepted' },
  { value: 'DEAL_CREATED', label: 'Deal created' },
  { value: 'PAYMENT_PENDING', label: 'Payment pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DISPUTED', label: 'Disputed' },
]

export function DealListFilters({
  filters,
  onChange,
  onReset,
  showAdminFilters = false,
  loading = false,
}) {
  return (
    <div className="dealFilters">
      <div className="dealFilters__row">
        <input
          type="search"
          className="b2bInput"
          placeholder="Search deal #, product, SKU…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          aria-label="Search deals"
        />
        <select
          className="b2bSelect"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="b2bInput"
          value={filters.fromDate}
          onChange={(event) => onChange({ fromDate: event.target.value })}
          aria-label="From date"
        />
        <input
          type="date"
          className="b2bInput"
          value={filters.toDate}
          onChange={(event) => onChange({ toDate: event.target.value })}
          aria-label="To date"
        />
      </div>

      <div className="dealFilters__row">
        <select
          className="b2bSelect"
          value={filters.sortBy}
          onChange={(event) => onChange({ sortBy: event.target.value })}
          aria-label="Sort by"
        >
          {DEAL_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          className="b2bSelect"
          value={filters.sortOrder}
          onChange={(event) => onChange({ sortOrder: event.target.value })}
          aria-label="Sort order"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>

        {showAdminFilters ? (
          <>
            <input
              type="text"
              className="b2bInput"
              placeholder="Buyer ID (UUID)"
              value={filters.buyerId}
              onChange={(event) => onChange({ buyerId: event.target.value })}
              aria-label="Filter by buyer ID"
            />
            <input
              type="text"
              className="b2bInput"
              placeholder="Seller ID (UUID)"
              value={filters.sellerId}
              onChange={(event) => onChange({ sellerId: event.target.value })}
              aria-label="Filter by seller ID"
            />
          </>
        ) : null}

        <button type="button" className="btnOutline" onClick={onReset} disabled={loading}>
          Reset
        </button>
      </div>
    </div>
  )
}
