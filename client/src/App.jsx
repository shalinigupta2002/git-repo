import { useEffect } from 'react'
import './App.css'
import { AppRoutes } from './router/AppRoutes.jsx'
import { GlobalLoader } from './components/common/GlobalLoader.jsx'
import { OfflineBanner } from './components/common/OfflineBanner.jsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx'
import { isMisconfiguredProductionApi } from './constants/env.js'

function App() {
  useEffect(() => {
    if (isMisconfiguredProductionApi) {
      console.error(
        '[config] VITE_API_BASE_URL is not set. Production builds default to /api on the Vercel host, ' +
          'so login/register hit the frontend (404). Set VITE_API_BASE_URL to your Render URL ending with /api and redeploy.',
      )
    }
  }, [])

  return (
    <>
      <GlobalLoader />
      <OfflineBanner />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </>
  )
}

export default App
