import { DealDetailPage } from '../deals/DealDetailPage.jsx'

export function BuyerDealDetail() {
  return (
    <DealDetailPage
      role="BUYER"
      listPath="/buyer/deals"
      counterpartyTitle="Seller contact"
      showPayment
    />
  )
}
