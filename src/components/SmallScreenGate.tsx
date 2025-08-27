import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import SmallScreenNotice from '@/components/SmallScreenNotice'

type SmallScreenGateProps = {
  children: ReactNode
  minWidthPx?: number
}

export function SmallScreenGate({ children, minWidthPx = 800 }: SmallScreenGateProps) {
  const [isSmall, setIsSmall] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${minWidthPx - 1}px)`)
    const update = () => setIsSmall(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
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


