import { Provider, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { store } from '../store/index.js'
import { setUnauthorizedHandler } from '../services/api.js'
import { logout } from '../store/slices/authSlice.js'

/**
 * Registers the global 401 handler once. When the server rejects a request
 * with 401 (outside of login/register), this:
 *   1. Clears Redux auth state immediately (synchronous logout)
 *   2. Shows an expiry toast
 *   3. Redirects to /login so the user can re-authenticate
 *
 * Navigation is done here rather than inside the Axios interceptor because
 * `useNavigate` must be called inside the Router tree.
 */
function ApiAuthBridge() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logout())
      toast.error('Session expired — please sign in again.')
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(() => {})
  }, [dispatch, navigate])

  return null
}

export function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <ApiAuthBridge />
      {children}
      <Toaster
        position="top-center"
        gutter={12}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontSize: '14px',
            boxShadow: 'var(--shadow-lift-sm, 0 6px 16px rgba(15,23,42,0.12))',
          },
        }}
      />
    </Provider>
  )
}
