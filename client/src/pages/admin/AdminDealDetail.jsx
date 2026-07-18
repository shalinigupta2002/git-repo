import { DealDetailPage } from '../deals/DealDetailPage.jsx'

export function AdminDealDetail() {
  return (
    <DealDetailPage
      role="ADMIN"
      listPath="/admin/deals"
      counterpartyTitle="Buyer contact"
      showAdminExtras
    />
  )
}
