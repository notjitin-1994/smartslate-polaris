import { memo } from 'react'

type HeaderSwirlBackgroundProps = {
  imageSrc?: string
  className?: string
}

const HeaderSwirlBackground = memo(({ imageSrc = '/images/logos/logo-swirl.png', className = '' }: HeaderSwirlBackgroundProps) => {
  // 50% more swirls, sizes reduced by ~30%
  const swirls = [
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

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-0 ${className}`} aria-hidden="true">
      {swirls.map((s) => (
        <img
          key={s.id}
          src={imageSrc}
          alt=""
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            transform: `translateY(0) rotate(${s.rotate}deg)` as any,
            filter: 'blur(0.3px)'
          }}
        />
      ))}
    </div>
  )
})

HeaderSwirlBackground.displayName = 'HeaderSwirlBackground'

export default HeaderSwirlBackground


