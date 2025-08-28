import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { OptimizedAppRouter } from '@/router/OptimizedAppRouter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { performanceMonitor } from '@/utils/performance'
import { installApiDebugInterceptor } from '@/dev/apiDebug'
import { installGlobalErrorTracking } from '@/dev/errorTracker'
import { isPolarisHost } from '@/utils/domainUtils'

// Ensure a consistent title on Polaris hosts as early as possible
if (typeof window !== 'undefined') {
  if (isPolarisHost()) {
    document.title = 'Smartslate | Polaris'
  }
}

// Install dev-only debugging (stub implementations)
if (import.meta.env.DEV) {
  installApiDebugInterceptor()
  installGlobalErrorTracking()
}

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