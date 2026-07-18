import { DealListPage } from '../deals/DealListPage.jsx'

export function AdminDealsList() {
  return (
    <DealListPage
      role="ADMIN"
      title="Deals"
      subtitle="All marketplace deals."
      detailBasePath="/admin/deals"
      showAdminFilters
    />
  )
}
