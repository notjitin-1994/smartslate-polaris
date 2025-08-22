export const paths = {
  home: '/',
  portal: '/portal',
  portalUser: '/portal/:user',
  settings: '/portal/settings',
} as const

export type AppPath = typeof paths[keyof typeof paths]

export function portalUserPath(user: string): string {
  const safe = (user || 'user').toString().trim()
  return `/portal/${encodeURIComponent(safe)}`
}


