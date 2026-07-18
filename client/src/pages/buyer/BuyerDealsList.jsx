import { Link } from 'react-router-dom'
import { DealListPage } from '../deals/DealListPage.jsx'

export function BuyerDealsList() {
  return (
    <DealListPage
      role="BUYER"
      title="My deals"
      subtitle="Deals created from accepted quotations."
      detailBasePath="/buyer/deals"
      emptyAction={<Link to="/buyer/quotations" className="btnPrimary">Browse quotations</Link>}
    />
  )
}
