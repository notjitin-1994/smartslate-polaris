import { memo, useMemo } from 'react'

// Lightweight starry overlay background with no external deps
const StarryBackground = memo(() => {
  const layers = useMemo(() => {
    // Generate a few subtle radial gradients to emulate stars
    const stars: Array<{ x: number; y: number; r: number; o: number }> = []
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 1.2 + 0.2,
        o: Math.random() * 0.7 + 0.15,
      })
    }
    return stars
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
      {/* Soft gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 1200px at 80% 0%, rgba(167,218,219,0.07), transparent 60%),\
             radial-gradient(900px 900px at 0% 100%, rgba(79,70,229,0.06), transparent 55%)',
        }}
      />
      {/* Star dots */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {layers.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`rgba(255,255,255,${s.o})`} />
        ))}
      </svg>
    </div>
  )
})

StarryBackground.displayName = 'StarryBackground'

export default StarryBackground
export { StarryBackground }


