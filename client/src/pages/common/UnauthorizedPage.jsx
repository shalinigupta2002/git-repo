import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../components/common/BrandLogo.jsx'

export function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="authPage">
      <div className="authCard authCard--elevated unauthorizedCard">
        <Link to="/" className="authBrand" aria-label="Home">
          <BrandLogo size="lg" />
        </Link>
        <div className="authHeader">
          <h1 className="authTitle">Access denied</h1>
          <p className="authSub">You don’t have access to this page.</p>
        </div>

        <div className="form form--tight">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
          <Link to="/" className="btn btn--ghost btn--block">
            Return to home
          </Link>
        </div>
      </div>
    </div>
  )
}
