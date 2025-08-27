import { memo, useEffect, useMemo, useState } from 'react'

/**
 * Full-page animated swirl background used on public report view.
 * Reused for the login page to keep brand-consistent visuals.
 */
const AnimatedSwirlBackground = memo(() => {
  const swirls = [
    { id: 1, size: 200, x: '10%', y: '15%', opacity: 0.15, delay: 0 },
    { id: 2, size: 350, x: '75%', y: '20%', opacity: 0.08, delay: 1500 },
    { id: 3, size: 150, x: '85%', y: '65%', opacity: 0.2, delay: 3000 },
    { id: 4, size: 400, x: '25%', y: '70%', opacity: 0.06, delay: 2000 },
    { id: 5, size: 250, x: '50%', y: '40%', opacity: 0.1, delay: 500 },
    { id: 6, size: 180, x: '5%', y: '85%', opacity: 0.12, delay: 2500 },
    { id: 7, size: 300, x: '60%', y: '80%', opacity: 0.07, delay: 1000 },
    { id: 8, size: 220, x: '35%', y: '10%', opacity: 0.09, delay: 3500 },
  ]

  const [isMobile, setIsMobile] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 640px)')
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const setAll = () => {
      setIsMobile(mqMobile.matches)
      setReduceMotion(mqReduce.matches)
    }
    setAll()
    mqMobile.addEventListener?.('change', setAll)
    mqReduce.addEventListener?.('change', setAll)
    return () => {
      mqMobile.removeEventListener?.('change', setAll)
      mqReduce.removeEventListener?.('change', setAll)
    }
  }, [])

  const effectiveSwirls = useMemo(() => {
    if (isMobile) {
      // Fewer, smaller, softer for mobile
      return swirls
        .filter((_, idx) => idx % 2 === 0) // halve density
        .map((s) => ({
          ...s,
          size: Math.round(s.size * 0.58),
          opacity: Math.max(0.05, s.opacity * 0.7),
        }))
    }
    return swirls
  }, [isMobile])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {effectiveSwirls.map((swirl) => (
        <div
          key={swirl.id}
          className={reduceMotion ? 'absolute' : 'absolute animate-float'}
          style={{
            left: swirl.x,
            top: swirl.y,
            animationDelay: `${swirl.delay}ms`,
            animationDuration: `${20 + swirl.id * 2}s`,
          }}
        >
          <img
            src="/images/logos/logo-swirl.png"
            alt=""
            className="select-none"
            style={{
              width: `${swirl.size}px`,
              height: `${swirl.size}px`,
              opacity: swirl.opacity,
              filter: isMobile ? 'blur(0.6px) saturate(0.95)' : 'blur(0.5px)',
            }}
            decoding="async"
            loading="lazy"
          />
        </div>
      ))}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-16px) rotate(4deg); }
          50% { transform: translateY(-8px) rotate(-4deg); }
          75% { transform: translateY(-12px) rotate(2deg); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
        @media (max-width: 640px) {
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-10px) rotate(3deg); }
            50% { transform: translateY(-5px) rotate(-3deg); }
            75% { transform: translateY(-8px) rotate(2deg); }
          }
          .animate-float { animation-duration: 26s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float { animation: none !important; }
        }
      `}</style>
    </div>
  )
})

AnimatedSwirlBackground.displayName = 'AnimatedSwirlBackground'

export default AnimatedSwirlBackground


