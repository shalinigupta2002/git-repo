import { useEffect, useRef } from 'react'
import { initializeAuth } from '../../store/slices/authSlice.js'
import { setBooting } from '../../store/slices/appSlice.js'
import { loadSubscriptionStatus } from '../../store/slices/subscriptionSlice.js'
import { useAppDispatch } from '../../hooks/redux.js'

/**
 * Dispatches `initializeAuth` exactly once on first mount.
 *
 * Auth is cookie-based: the browser automatically sends the httpOnly
 * `auth_token` cookie with the GET /auth/me request. No localStorage
 * token lookup or URL query param scanning needed.
 *
 * Children are always rendered immediately; pages that need auth should
 * read `initialized` from the auth slice (exposed via `useAuth`), not
 * gate on `AuthInitializer` mounting.
 */
export function AuthInitializer({ children }) {
  const dispatch = useAppDispatch()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    dispatch(initializeAuth())
      .then((action) => {
        // Load subscription state only when the user is authenticated.
        // initializeAuth.fulfilled carries the user object (or null).
        if (action.payload) {
          dispatch(loadSubscriptionStatus())
        }
      })
      .finally(() => {
        dispatch(setBooting(false))
      })
  }, [dispatch])

  return children
}
