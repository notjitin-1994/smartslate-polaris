import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import SmallScreenNotice from '@/components/SmallScreenNotice'

type SmallScreenGateProps = {
  children: ReactNode
  minWidthPx?: number
}

export function SmallScreenGate({ children, minWidthPx = 800 }: SmallScreenGateProps) {
  const [isSmall, setIsSmall] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return false
    try {
      const media = window.matchMedia(`(max-width: ${minWidthPx - 1}px)`)
      return media.matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${minWidthPx - 1}px)`)
    const update = () => setIsSmall(media.matches)
    // Listen using addEventListener when available, otherwise fallback to addListener for older browsers
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener?.('change', update)
    } else if (typeof (media as any).addListener === 'function') {
      ;(media as any).addListener(update)
      return () => (media as any).removeListener?.(update)
    }
    return () => {}
  }, [minWidthPx])

  if (isSmall === null) {
    return null
  }

  if (isSmall) {
    return <SmallScreenNotice minWidthPx={minWidthPx} />
  }

  return <>{children}</>
}

export default SmallScreenGate


