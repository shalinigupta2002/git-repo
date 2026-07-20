import { Link } from 'react-router-dom'
import { DealListPage } from '../deals/DealListPage.jsx'

export function BuyerDealsList() {
  return (
    <DealListPage
      role="BUYER"
      title="My Orders"
      subtitle="Track your accepted quotations, platform deal charges, and unlocked seller contact details."
      detailBasePath="/buyer/deals"
      emptyAction={<Link to="/buyer/quotations" className="btnPrimary">Browse quotations</Link>}
    />
  )
}
