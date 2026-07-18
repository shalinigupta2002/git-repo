import { Link } from 'react-router-dom'
import { DealListPage } from '../deals/DealListPage.jsx'

export function SellerDealsList() {
  return (
    <DealListPage
      role="SELLER"
      title="My deals"
      subtitle="Deals from buyers who accepted your quotations."
      detailBasePath="/seller/deals"
      emptyAction={<Link to="/seller/quotations" className="btnPrimary">Open quotations</Link>}
    />
  )
}
