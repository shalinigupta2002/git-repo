import { Link } from 'react-router-dom'

export function MarketplaceIdDisplay({ marketplaceId, label = 'Marketplace ID' }) {
  return (
    <div className="metricCard__hint">
      <span>{label}: </span>
      {marketplaceId ? (
        <span className="marketplaceIdBadge">{marketplaceId}</span>
      ) : (
        <span>No Marketplace ID Assigned</span>
      )}
    </div>
  )
}

export function ProfileLinkHint() {
  return (
    <Link to="/portal/profile" className="metricCard__link">
      View full profile →
    </Link>
  )
}
