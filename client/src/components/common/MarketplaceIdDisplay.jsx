import { Link } from 'react-router-dom'

export function UserIdDisplay({ portalUserId, userId, marketplaceId, label = 'User ID' }) {
  const id = portalUserId ?? userId ?? marketplaceId
  return (
    <div className="metricCard__hint">
      <span>{label}: </span>
      {id ? (
        <span className="marketplaceIdBadge">{id}</span>
      ) : (
        <span>No User ID Assigned</span>
      )}
    </div>
  )
}

/** @deprecated Use UserIdDisplay */
export function MarketplaceIdDisplay(props) {
  return <UserIdDisplay {...props} />
}

export function ProfileLinkHint() {
  return (
    <Link to="/portal/profile" className="metricCard__link">
      View full profile →
    </Link>
  )
}
