import { useNetworkStatus } from '../../hooks/useNetworkStatus.js'

/**
 * Fixed-position banner that appears only while the browser reports the
 * device as offline. Polite and non-blocking; the app remains interactive
 * so cached/already-loaded views continue to work.
 */
export function OfflineBanner() {
  const { online } = useNetworkStatus()

  if (online) return null

  return (
    <div className="offlineBanner" role="alert" aria-live="assertive">
      <span className="offlineBanner__dot" aria-hidden />
      <span className="offlineBanner__text">
        No internet connection — some actions may be unavailable.
      </span>
    </div>
  )
}
