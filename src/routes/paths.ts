export const paths = {
  home: '/',
  portal: '/',
  portalUser: '/:user',
  settings: '/settings',
  pricing: '/pricing',
  publicProfile: '/:username',
  needsAnalysis: '/needs-analysis',
  needsAnalysisNew: '/needs-analysis/new',
  needsAnalysisProject: '/needs-analysis/:id',
  needsAnalysisIntake: '/needs-analysis/:id/intake',
  needsAnalysisDiagnostic: '/needs-analysis/:id/diagnostic',
  needsAnalysisRecommendation: '/needs-analysis/:id/recommendation',
  needsAnalysisReport: '/needs-analysis/:id/report',
} as const

export type AppPath = typeof paths[keyof typeof paths]

export function portalUserPath(user: string): string {
  const safe = (user || 'user').toString().trim()
  return `/${encodeURIComponent(safe)}`
}

export function publicProfilePath(username: string): string {
  const safe = (username || 'user').toString().trim()
  return `/${encodeURIComponent(safe)}`
}


