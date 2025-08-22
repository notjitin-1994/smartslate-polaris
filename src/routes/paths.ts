export const paths = {
  home: '/',
  portal: '/portal',
  portalUser: '/portal/:user',
  settings: '/portal/settings',
  publicProfile: '/:username',
} as const

export type AppPath = typeof paths[keyof typeof paths]

export function portalUserPath(user: string): string {
  const safe = (user || 'user').toString().trim()
  return `/portal/${encodeURIComponent(safe)}`
}

export function publicProfilePath(username: string): string {
  const safe = (username || 'user').toString().trim()
  return `/${encodeURIComponent(safe)}`
}


