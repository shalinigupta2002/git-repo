import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BrandLogo } from '../../components/common/BrandLogo.jsx'
import { login, logout } from '../../store/slices/authSlice.js'
import { loadSubscriptionStatus } from '../../store/slices/subscriptionSlice.js'
import { useAppDispatch } from '../../hooks/redux.js'
import { Spinner } from '../../components/ui/Spinner.jsx'
import {
  clearIntendedRoute,
  getIntendedRoute,
} from '../../utils/authStorage.js'
import { PORTAL_HOME, roleDashboardPath, isPathAllowedForUser } from '../../utils/portalNav.js'
import { resolveSellerEntryPath } from '../../utils/sellerSubscription.js'

const schema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
})

function redirectPath(user, fallback) {
  if (user.role === 'ADMIN') return fallback || '/admin'
  return fallback || roleDashboardPath(user.role) || PORTAL_HOME
}

function isRolePathAllowed(role, path, subscriptionFlags = {}) {
  return isPathAllowedForUser({ role }, path, subscriptionFlags)
}

function safeRedirectPath(user, requestedPath, subscriptionFlags = {}) {
  const fallback = redirectPath(user, null)
  if (!isRolePathAllowed(user.role, requestedPath, subscriptionFlags)) return fallback
  return requestedPath
}

export function LoginPage({ variant = 'default' }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [apiError, setApiError] = useState('')

  const storedIntent = getIntendedRoute()
  const from =
    location.state?.from?.pathname ||
    searchParams.get('redirect') ||
    storedIntent?.pathname ||
    (variant === 'admin' ? '/admin' : null)

  const title = variant === 'admin' ? 'Admin sign in' : 'Sign in'
  const subtitle =
    variant === 'admin'
      ? 'Use your platform admin account (JWT from API).'
      : 'Access your buyer or seller workspace.'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  const onSubmit = async (values) => {
    setApiError('')
    const action = await dispatch(login(values))
    if (login.rejected.match(action)) {
      const msg = action.payload || 'Login failed'
      setApiError(msg)
      toast.error(msg)
      return
    }
    const user = action.payload
    if (variant === 'admin' && user.role !== 'ADMIN') {
      dispatch(logout())
      const msg = 'This account is not an admin.'
      setApiError(msg)
      toast.error(msg)
      return
    }
    clearIntendedRoute()
    const subAction = await dispatch(loadSubscriptionStatus())
    const subFlags = {
      hasBuyer: Boolean(subAction.payload?.hasBuyerSubscription),
      hasSeller: Boolean(subAction.payload?.hasSellerSubscription),
    }
    toast.success('Signed in successfully')
    let target = safeRedirectPath(user, from, subFlags) || PORTAL_HOME
    if (user.role !== 'ADMIN' && target.startsWith('/seller')) {
      target = resolveSellerEntryPath(target)
    }
    navigate(target, { replace: true })
  }

  return (
    <div className="authPage">
      <div className="authCard authCard--elevated">
        <Link to="/" className="authBrand" aria-label="Home">
          <BrandLogo size="lg" />
        </Link>
        <div className="authHeader">
          <h1 className="authTitle">{title}</h1>
          <p className="authSub">{subtitle}</p>
        </div>

        <form className="form form--tight" noValidate onSubmit={handleSubmit(onSubmit)}>
          <label className="field">
            <div className="fieldLabel">Email</div>
            <input
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              className={`input ${errors.email ? 'input--error' : ''}`}
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? <div className="fieldError">{errors.email.message}</div> : null}
          </label>

          <label className="field">
            <div className="fieldLabel">Password</div>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={`input ${errors.password ? 'input--error' : ''}`}
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? <div className="fieldError">{errors.password.message}</div> : null}
          </label>

          {apiError ? (
            <div className="fieldError" style={{ marginBottom: 4 }}>{apiError}</div>
          ) : null}

          <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" /> Signing in…
              </>
            ) : (
              'Continue'
            )}
          </button>

          {variant === 'admin' ? (
            <p className="authFooterText">
              <Link to="/login">Standard sign in</Link>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
