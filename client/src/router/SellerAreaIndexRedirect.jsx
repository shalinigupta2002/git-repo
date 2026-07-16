import { Navigate } from 'react-router-dom'

/** `/seller` lands on the seller welcome page after sign-in. */
export function SellerAreaIndexRedirect() {
  return <Navigate to="/seller/welcome" replace />
}
