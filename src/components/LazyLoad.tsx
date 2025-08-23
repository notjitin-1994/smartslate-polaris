import React, { Suspense } from 'react'
import type { ComponentType, ReactNode } from 'react'

interface LazyLoadProps {
  fallback?: ReactNode
  errorFallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary for lazy loaded components
 */
class LazyErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-white/60">
            <svg className="w-12 h-12 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Failed to load component</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              Reload Page
            </button>
          </div>
        )
      )
    }
    
    return this.props.children
  }
}

/**
 * Default loading component
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-white/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary-400 rounded-full animate-spin border-t-transparent"></div>
    </div>
  </div>
)

/**
 * Higher-order component for lazy loading with error boundary
 */
export function withLazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadProps = {}
) {
  const LazyComponent = React.lazy(importFunc)
  
  return (props: React.ComponentProps<T>) => (
    <LazyErrorBoundary fallback={options.errorFallback}>
      <Suspense fallback={options.fallback || <DefaultLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  )
}

/**
 * Component for lazy loading with custom loading and error states
 */
export function LazyLoad({
  children,
  fallback = <DefaultLoadingFallback />,
  errorFallback,
}: LazyLoadProps & { children: ReactNode }) {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </LazyErrorBoundary>
  )
}
