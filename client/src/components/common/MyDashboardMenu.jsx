import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useAppSelector } from '../../hooks/redux.js'
import {
  selectHasBuyerSubscription,
  selectHasSellerSubscription,
} from '../../store/slices/subscriptionSlice.js'
import { persistWorkspace } from '../../utils/activeWorkspace.js'
import { marketingDashboardMenuOptions } from '../../utils/portalNav.js'

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MyDashboardMenu({
  label = 'My Dashboard',
  linkClassName = 'subNav__link subNav__link--dashboard',
  menuClassName = 'dashboardMenu',
}) {
  const { user, initialized, isAuthenticated } = useAuth()
  const hasBuyer = useAppSelector(selectHasBuyerSubscription)
  const hasSeller = useAppSelector(selectHasSellerSubscription)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const options = useMemo(
    () =>
      marketingDashboardMenuOptions({
        role: user?.role,
        hasBuyer,
        hasSeller,
      }),
    [user?.role, hasBuyer, hasSeller],
  )

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!initialized || !isAuthenticated) return null

  if (!options.length) return null

  if (user?.role === 'ADMIN') {
    return (
      <Link to="/admin" className={linkClassName}>
        Admin Dashboard
      </Link>
    )
  }

  return (
    <div
      ref={rootRef}
      className={[menuClassName, open ? 'dashboardMenu--open' : ''].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={`${linkClassName} dashboardMenu__trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        <ChevronIcon />
      </button>
      <div className="dashboardMenu__panel" role="menu">
        {options.map((option) => (
          <Link
            key={option.label}
            to={option.to}
            role="menuitem"
            className={`dashboardMenu__item${option.locked ? ' dashboardMenu__item--locked' : ''}`}
            onClick={() => {
              if (!option.locked && option.workspace) {
                persistWorkspace(option.workspace)
              }
              setOpen(false)
            }}
          >
            {option.label}
            {option.locked ? <span className="dashboardMenu__lockHint">Subscribe</span> : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
