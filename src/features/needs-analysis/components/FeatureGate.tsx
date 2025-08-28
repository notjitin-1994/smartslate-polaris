import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isNeedsAnalysisEnabled } from '../utils/featureFlag'

interface FeatureGateProps {
  children: ReactNode
  fallback?: ReactNode | string
  redirect?: string
}

/**
 * Feature gate component for needs analysis
 * Conditionally renders children based on feature flag
 */
export function NeedsAnalysisFeatureGate({ 
  children, 
  fallback = null,
  redirect 
}: FeatureGateProps) {
  if (!isNeedsAnalysisEnabled()) {
    if (redirect) {
      return <Navigate to={redirect} replace />
    }
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
