import { useEffect, useState } from 'react'

function readInitialOnline() {
  if (typeof navigator === 'undefined') return true
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true
}

/**
 * Subscribe to browser online/offline events.
 *
 * Returns `{ online }` where `online` flips to `false` the moment the OS
 * drops the connection and back to `true` when it returns. Safe for use
 * anywhere — works in SSR/non-DOM environments by defaulting to online.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(readInitialOnline)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online }
}
