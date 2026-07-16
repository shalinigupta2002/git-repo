import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './context/AppProviders.jsx'
import { AuthInitializer } from './components/common/AuthInitializer.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AuthInitializer>
          <App />
        </AuthInitializer>
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
