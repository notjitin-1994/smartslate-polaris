import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { OptimizedAppRouter } from '@/router/OptimizedAppRouter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getSupabase } from '@/services/supabase'
import { performanceMonitor } from '@/utils/performance'

// Initialize Supabase early so cross-subdomain session adoption (cookie handoff) runs at startup
getSupabase()

// Initialize performance monitoring in production
if (import.meta.env.PROD) {
  // Log metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logMetrics()
      performanceMonitor.sendMetrics()
    }, 2000)
  })
}

// Mount the app
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <OptimizedAppRouter />
    </ErrorBoundary>
  </StrictMode>
)