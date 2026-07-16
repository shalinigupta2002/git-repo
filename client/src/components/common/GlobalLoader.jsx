import { useAppSelector } from '../../hooks/redux.js'
import {
  selectBooting,
  selectGlobalLoading,
} from '../../store/slices/appSlice.js'
import { Spinner } from '../ui/Spinner.jsx'

/**
 * App-wide overlay/indicator driven by the `app` slice:
 *   • When `app.booting` is true, render a full-screen loader (gates first
 *     paint during auth rehydration).
 *   • When `app.globalLoading` is true (and booting has finished), render a
 *     thin progress bar at the top of the viewport. Non-blocking so users
 *     can still interact with the page.
 */
export function GlobalLoader() {
  const booting = useAppSelector(selectBooting)
  const globalLoading = useAppSelector(selectGlobalLoading)

  if (booting) {
    return (
      <div className="globalBoot" role="status" aria-live="polite">
        <Spinner size="lg" />
        <p className="globalBoot__text">Loading…</p>
      </div>
    )
  }

  if (globalLoading) {
    return (
      <div className="globalProgress" role="status" aria-live="polite" aria-label="Loading">
        <div className="globalProgress__bar" />
      </div>
    )
  }

  return null
}
