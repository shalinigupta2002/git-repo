import { DealDetailPage } from '../deals/DealDetailPage.jsx'

export function SellerDealDetail() {
  return (
    <DealDetailPage
      role="SELLER"
      listPath="/seller/deals"
      counterpartyTitle="Buyer contact"
      showPayment
    />
  )
}
