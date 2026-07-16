import { Link, Outlet } from 'react-router-dom'
import { HomeMarketingNav } from '../components/common/HomeMarketingNav.jsx'

/** Minimal chrome for /subscribe/* checkout (no buyer/seller sidebar). */
export function SubscribeCheckoutLayout() {
  return (
    <div className="subPage">
      <HomeMarketingNav tagline="Complete your subscription" />
      <main className="subMain" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
      <p className="homeSubscribe__foot" style={{ textAlign: 'center', paddingBottom: 24 }}>
        <Link to="/pricing">← Back to pricing</Link>
      </p>
    </div>
  )
}
