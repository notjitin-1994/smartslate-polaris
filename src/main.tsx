import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { OptimizedAppRouter } from './router/OptimizedAppRouter'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Mount the app
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find root element')
}

// In development, aggressively unregister any existing service workers and clear caches
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {})
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <OptimizedAppRouter />
    </ErrorBoundary>
  </StrictMode>
)