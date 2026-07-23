import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useAppSelector } from '../../hooks/redux.js'
import {
  selectHasBuyerSubscription,
  selectHasSellerSubscription,
} from '../../store/slices/subscriptionSlice.js'
import {
  BUYER_DASHBOARD_PATH,
  SELLER_DASHBOARD_PATH,
  canAccessBuyerWorkspace,
  canAccessSellerWorkspace,
} from '../../utils/portalNav.js'

export function PortalHome() {
  const { user } = useAuth()
  const hasBuyerSub = useAppSelector(selectHasBuyerSubscription)
  const hasSellerSub = useAppSelector(selectHasSellerSubscription)
  const role = user?.role
  const buyerAccess = canAccessBuyerWorkspace(role, hasBuyerSub)
  const sellerAccess = canAccessSellerWorkspace(role, hasSellerSub)

  return (
    <div className="sellerDashboard">
      <div className="sellerDashboard__pageTitle">
        <h1 className="sellerDashboard__greeting">
          Welcome, {user?.companyName || user?.email || 'there'}!
        </h1>
        <p className="sellerDashboard__sub">
          {buyerAccess && sellerAccess
            ? 'Use the workspace switcher in the header to work in buyer or seller mode — one workspace at a time.'
            : buyerAccess
              ? 'Open your buyer workspace, browse the catalog, manage plans, or contact platform admin.'
              : sellerAccess
                ? 'Open your seller workspace, manage listings, view plans, or contact platform admin.'
                : 'Use the menu to manage your account.'}
        </p>
      </div>

      <div className="sellerDashboard__grid" style={{ marginTop: 8 }}>
        {buyerAccess ? (
          <div className="metricCard metricCard--blue">
            <div className="metricCard__label">Buyer plan</div>
            <div className="metricCard__value">{hasBuyerSub ? 'Active' : 'Not subscribed'}</div>
            <Link to={BUYER_DASHBOARD_PATH} className="metricCard__link">
              Open buyer dashboard →
            </Link>
          </div>
        ) : null}

        {sellerAccess ? (
          <div className="metricCard metricCard--purple">
            <div className="metricCard__label">Seller plan</div>
            <div className="metricCard__value">{hasSellerSub ? 'Active' : 'Not subscribed'}</div>
            <Link to={SELLER_DASHBOARD_PATH} className="metricCard__link">
              Open seller dashboard →
            </Link>
          </div>
        ) : null}

        {buyerAccess ? (
          <div className="metricCard metricCard--green">
            <div className="metricCard__label">Browse catalog</div>
            <div className="metricCard__value">Public products</div>
            <Link to="/products" className="metricCard__link">
              View product catalog →
            </Link>
          </div>
        ) : null}

        {sellerAccess ? (
          <div className="metricCard metricCard--green">
            <div className="metricCard__label">Product listings</div>
            <div className="metricCard__value">Manage catalog</div>
            <Link to="/seller/products" className="metricCard__link">
              View your listings →
            </Link>
          </div>
        ) : null}

        {(buyerAccess && !hasBuyerSub) || (sellerAccess && !hasSellerSub) ? (
          <div className="metricCard metricCard--amber">
            <div className="metricCard__label">Subscriptions</div>
            <div className="metricCard__value">Plans &amp; pricing</div>
            <Link to="/pricing" className="metricCard__link">
              View plans →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
