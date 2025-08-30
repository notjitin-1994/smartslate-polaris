import type { ThemeSpec } from '@/starmap/types/visual-schema'

export function applyTheme(theme: ThemeSpec) {
  const root = document.documentElement
  const set = (k: string, v: string|number) => root.style.setProperty(k, String(v))

  set('--bg-app', theme.color.background.app)
  set('--bg-surface', theme.color.background.surface)
  set('--bg-elevated', theme.color.background.elevated)
  set('--color-primary', theme.color.primary)
  set('--color-secondary', theme.color.secondary)
  set('--color-accent', theme.color.accent)

  if (theme.motion?.reduce_motion_respect) {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      root.style.setProperty('--motion-reduced', mq.matches ? '1' : '0')
    } catch {}
  }
}


