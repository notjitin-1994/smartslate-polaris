import { env } from '@/config/env'

/**
 * Check if needs analysis feature is enabled
 */
export function isNeedsAnalysisEnabled(): boolean {
  return env.needsAnalysisEnabled || env.isDev
}

/**
 * Feature flags for needs analysis sub-features
 */
export const needsAnalysisFeatures = {
  // Core feature
  enabled: isNeedsAnalysisEnabled(),
  
  // Sub-features that can be toggled independently
  pdfExport: true,
  approvalWorkflow: true,
  emailNotifications: false, // Future enhancement
  advancedEstimation: true,
  aiRecommendations: true,
} as const
