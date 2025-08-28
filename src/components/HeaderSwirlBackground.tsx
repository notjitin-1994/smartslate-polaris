import { memo, useEffect, useMemo, useState } from 'react'

type HeaderSwirlBackgroundProps = {
  imageSrc?: string
  className?: string
}

const HeaderSwirlBackground = memo(({ imageSrc = '/images/logos/logo-swirl.png', className = '' }: HeaderSwirlBackgroundProps) => {
  const baseSwirls = [
    { id: 1, size: 92, left: '-4%', top: '-24%', opacity: 0.06, rotate: -12 },
    { id: 2, size: 59, left: '6%', top: '36%', opacity: 0.10, rotate: 8 },
    { id: 3, size: 109, left: '16%', top: '-22%', opacity: 0.08, rotate: 12 },
    { id: 4, size: 76, left: '26%', top: '32%', opacity: 0.11, rotate: -10 },
    { id: 5, size: 101, left: '38%', top: '-20%', opacity: 0.07, rotate: 5 },
    { id: 6, size: 63, left: '50%', top: '38%', opacity: 0.12, rotate: -6 },
    { id: 7, size: 109, left: '62%', top: '-18%', opacity: 0.06, rotate: 14 },
    { id: 8, size: 66, left: '72%', top: '34%', opacity: 0.10, rotate: -4 },
    { id: 9, size: 90, left: '82%', top: '-22%', opacity: 0.08, rotate: 6 },
    { id: 10, size: 72, left: '90%', top: '40%', opacity: 0.12, rotate: -8 },
    { id: 11, size: 102, left: '96%', top: '-20%', opacity: 0.06, rotate: 10 },
  ]

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const swirls = useMemo(() => {
    const randomizeOpacity = (base: number) => {
      const factor = 0.8 + Math.random() * 0.2
      const value = base * factor
      return Math.min(1, Math.max(0, value))
    }

    if (isMobile) {
      return baseSwirls
        .filter((s) => Number(s.left.replace('%','')) <= 60) // keep left cluster only
        .filter((_, idx) => idx % 2 === 0)
        .slice(0, 4)
        .map((s) => ({
          ...s,
          size: Math.round(s.size * 0.7),
          opacity: Math.max(0.05, randomizeOpacity(s.opacity * 0.75)),
        }))
    }
    return baseSwirls.map((s) => ({
      ...s,
      opacity: randomizeOpacity(s.opacity),
    }))
  }, [isMobile])

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-0 ${className}`} aria-hidden="true">
      {/* Ambient gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 1200px at 80% 0%, rgba(var(--primary),0.10), transparent 60%),\
             radial-gradient(900px 900px at 0% 100%, rgba(79,70,229,0.10), transparent 55%)',
        }}
      />

      {/* Subtle noise overlay via SVG data URI for depth */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.06,
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Minimal, soft swirls */}
      {swirls.map((s) => (
        <img
          key={s.id}
          src={imageSrc}
          alt=""
          decoding="async"
          loading="lazy"
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            transform: `translateY(0) rotate(${s.rotate}deg)` as any,
            filter: 'blur(0.4px) saturate(0.95)',
            mixBlendMode: 'soft-light',
          }}
        />
      ))}

      {/* Gentle vignette mask to focus header content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 20%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />

      <style>{`
        @media (max-width: 640px) {
          /* Slightly soften gradients on mobile */
          .${className || 'inset-0'} {
            backdrop-filter: blur(0px);
          }
        }
      `}</style>
    </div>
  )
})

HeaderSwirlBackground.displayName = 'HeaderSwirlBackground'

export default HeaderSwirlBackground


