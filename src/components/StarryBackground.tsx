import { memo, useEffect, useMemo, useState } from 'react'

type Star = {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  twinkleDelay: number
}

type Nebula = {
  id: number
  x: string
  y: string
  blur: number
  opacity: number
  gradientFrom: string
  gradientTo: string
  rotate: number
  scale: number
}

type Galaxy = {
  id: number
  x: string
  y: string
  size: number
  opacity: number
  rotate: number
}

type StarryBackgroundProps = {
  className?: string
  starCount?: number
}

type Tier = 'mobile' | 'tablet' | 'desktop' | 'ultra'

const StarryBackground = memo(({ className = '', starCount }: StarryBackgroundProps) => {
  const [tier, setTier] = useState<Tier>('desktop')
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const getTier = (w: number): Tier => {
      if (w < 640) return 'mobile'
      if (w < 1024) return 'tablet'
      if (w < 1536) return 'desktop'
      return 'ultra'
    }
    const update = () => {
      setTier(getTier(window.innerWidth))
      setReduceMotion(mqReduce.matches)
    }
    update()
    window.addEventListener('resize', update)
    mqReduce.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      mqReduce.removeEventListener?.('change', update)
    }
  }, [])

  const config = useMemo(() => {
    switch (tier) {
      case 'mobile':
        return {
          starCount: 90,
          starSizeMin: 0.3,
          starSizeAmp: 0.9,
          starOpacityMin: 0.15,
          starOpacityAmp: 0.4,
          twinkleDuration: 8,
          nodeThreshold: 1.0,
          lineMaxNeighbors: 2,
          lineMaxDistance: 16,
          lineStrokeWidth: 0.1,
          lineBaseOpacity: 0.03,
          lineStrengthScale: 0.08,
          enableLines: true,
          connectionRegion: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
          nebulaScale: 0.95,
          nebulaOpacity: 0.9,
          nebulaBlur: 0.9,
          galaxyScale: 0.8,
          galaxyOpacity: 0.9,
          vignetteCss:
            'radial-gradient(70% 70% at 50% 40%, rgba(255,255,255,0.04) 0%, rgba(2,12,27,0) 38%, rgba(2,12,27,0.55) 78%, rgba(2,12,27,0.85) 100%)',
        }
      case 'tablet':
        return {
          starCount: 140,
          starSizeMin: 0.35,
          starSizeAmp: 1.2,
          starOpacityMin: 0.18,
          starOpacityAmp: 0.5,
          twinkleDuration: 7,
          nodeThreshold: 1.2,
          lineMaxNeighbors: 3,
          lineMaxDistance: 20,
          lineStrokeWidth: 0.12,
          lineBaseOpacity: 0.05,
          lineStrengthScale: 0.12,
          enableLines: true,
          connectionRegion: { xMin: 12, xMax: 88, yMin: 12, yMax: 88 },
          nebulaScale: 1.0,
          nebulaOpacity: 1.0,
          nebulaBlur: 1.0,
          galaxyScale: 0.9,
          galaxyOpacity: 0.95,
          vignetteCss:
            'radial-gradient(65% 65% at 50% 38%, rgba(255,255,255,0.03) 0%, rgba(2,12,27,0) 42%, rgba(2,12,27,0.5) 86%, rgba(2,12,27,0.8) 100%)',
        }
      case 'ultra':
        return {
          starCount: 260,
          starSizeMin: 0.4,
          starSizeAmp: 1.8,
          starOpacityMin: 0.2,
          starOpacityAmp: 0.6,
          twinkleDuration: 6,
          nodeThreshold: 1.7,
          lineMaxNeighbors: 2,
          lineMaxDistance: 18,
          lineStrokeWidth: 0.12,
          lineBaseOpacity: 0.04,
          lineStrengthScale: 0.10,
          enableLines: true,
          connectionRegion: { xMin: 28, xMax: 72, yMin: 20, yMax: 80 },
          nebulaScale: 1.15,
          nebulaOpacity: 1.05,
          nebulaBlur: 1.0,
          galaxyScale: 1.1,
          galaxyOpacity: 1.0,
          vignetteCss:
            'radial-gradient(80% 80% at 50% 30%, rgba(255,255,255,0.02) 0%, rgba(2,12,27,0) 60%, rgba(2,12,27,0.38) 98%)',
        }
      case 'desktop':
      default:
        return {
          starCount: 220,
          starSizeMin: 0.4,
          starSizeAmp: 1.6,
          starOpacityMin: 0.2,
          starOpacityAmp: 0.6,
          twinkleDuration: 6,
          nodeThreshold: 1.4,
          lineMaxNeighbors: 3,
          lineMaxDistance: 22,
          lineStrokeWidth: 0.15,
          lineBaseOpacity: 0.06,
          lineStrengthScale: 0.14,
          enableLines: true,
          connectionRegion: { xMin: 22, xMax: 78, yMin: 18, yMax: 82 },
          nebulaScale: 1.1,
          nebulaOpacity: 1.0,
          nebulaBlur: 1.0,
          galaxyScale: 1.0,
          galaxyOpacity: 1.0,
          vignetteCss:
            'radial-gradient(75% 75% at 50% 30%, rgba(255,255,255,0.02) 0%, rgba(2,12,27,0) 55%, rgba(2,12,27,0.42) 95%)',
        }
    }
  }, [tier])

  const effectiveStarCount = starCount ?? config.starCount

  const stars: Star[] = useMemo(() => {
    const arr: Star[] = []
    const sizeMin = config.starSizeMin
    const sizeAmp = config.starSizeAmp
    const opacityMin = config.starOpacityMin
    const opacityAmp = config.starOpacityAmp
    for (let i = 0; i < effectiveStarCount; i += 1) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * sizeAmp + sizeMin,
        opacity: Math.random() * opacityAmp + opacityMin,
        twinkleDelay: Math.random() * 6,
      })
    }
    return arr
  }, [effectiveStarCount, config.starSizeMin, config.starSizeAmp, config.starOpacityMin, config.starOpacityAmp])

  // Identify larger stars to serve as graph nodes
  const largeStars = useMemo(() => {
    return stars.filter((s) => s.size >= config.nodeThreshold)
  }, [stars, config.nodeThreshold])

  type Edge = { id: string; x1: number; y1: number; x2: number; y2: number; opacity: number }

  // Build subtle connections (neural network-like) between nearby large stars
  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = []
    if (!config.enableLines) return result
    const maxNeighbors = config.lineMaxNeighbors
    const maxDistance = config.lineMaxDistance // in percentage units of the container
    const { xMin, xMax, yMin, yMax } = config.connectionRegion
    const inRegion = (s: Star) => s.x >= xMin && s.x <= xMax && s.y >= yMin && s.y <= yMax
    const nodes = largeStars.filter(inRegion)
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i]
      const distances: Array<{ j: number; d: number }> = []
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.sqrt(dx * dx + dy * dy)
        distances.push({ j, d })
      }
      distances.sort((p, q) => p.d - q.d)
      let connected = 0
      for (const { j, d } of distances) {
        if (d > maxDistance) break
        const b = largeStars[j]
        const strength = Math.max(0, Math.min(1, 1 - d / maxDistance))
        result.push({
          id: `${a.id}-${b.id}`,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          opacity: config.lineBaseOpacity + strength * config.lineStrengthScale,
        })
        connected += 1
        if (connected >= maxNeighbors) break
      }
    }
    return result
  }, [largeStars, config.lineMaxNeighbors, config.lineMaxDistance, config.lineBaseOpacity, config.lineStrengthScale])

  const nebulae: Nebula[] = useMemo(() => ([
    {
      id: 1,
      x: '-10%',
      y: '-8%',
      blur: 80 * config.nebulaBlur,
      opacity: 0.18 * config.nebulaOpacity,
      gradientFrom: 'from-secondary-500/30',
      gradientTo: 'to-primary-400/10',
      rotate: -15,
      scale: 1.2 * config.nebulaScale,
    },
    {
      id: 2,
      x: '70%',
      y: '10%',
      blur: 100 * config.nebulaBlur,
      opacity: 0.14 * config.nebulaOpacity,
      gradientFrom: 'from-primary-400/30',
      gradientTo: 'to-secondary-500/10',
      rotate: 25,
      scale: 1.4 * config.nebulaScale,
    },
    {
      id: 3,
      x: '15%',
      y: '70%',
      blur: 120 * config.nebulaBlur,
      opacity: 0.12 * config.nebulaOpacity,
      gradientFrom: 'from-secondary-500/25',
      gradientTo: 'to-primary-400/10',
      rotate: 8,
      scale: 1.6 * config.nebulaScale,
    },
  ]), [config.nebulaScale, config.nebulaOpacity, config.nebulaBlur])

  const galaxies: Galaxy[] = useMemo(() => ([
    { id: 1, x: '78%', y: '22%', size: 240 * config.galaxyScale, opacity: 0.1 * config.galaxyOpacity, rotate: 35 },
    { id: 2, x: '18%', y: '18%', size: 180 * config.galaxyScale, opacity: 0.08 * config.galaxyOpacity, rotate: -20 },
    { id: 3, x: '60%', y: '72%', size: 200 * config.galaxyScale, opacity: 0.08 * config.galaxyOpacity, rotate: 12 },
  ]), [config.galaxyScale, config.galaxyOpacity])

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {/* Nebulae layer (far background) */}
      <div className="absolute inset-0">
        {nebulae.map((n) => (
          <div
            key={n.id}
            className={`absolute rounded-full ${n.gradientFrom} ${n.gradientTo} bg-gradient-to-br`}
            style={{
              left: n.x,
              top: n.y,
              width: `${420 * n.scale}px`,
              height: `${420 * n.scale}px`,
              opacity: n.opacity,
              transform: `rotate(${n.rotate}deg)`,
              filter: `blur(${n.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* Galaxies layer (soft spiral-ish glow) */}
      <div className="absolute inset-0">
        {galaxies.map((g) => (
          <div
            key={g.id}
            className="absolute"
            style={{ left: g.x, top: g.y, opacity: g.opacity, transform: `rotate(${g.rotate}deg)` }}
          >
            <div
              className="relative"
              style={{ width: g.size, height: g.size }}
            >
              <div className="absolute inset-0 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-primary-400/15 to-secondary-500/10 blur-2xl" />
              <div className="absolute inset-6 rounded-full bg-white/5 blur-xl" />
              <div className="absolute inset-12 rounded-full bg-white/10 blur-2xl opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* Connections between larger stars (neural network) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.08))' }}>
          {edges.map((e) => (
            <line
              key={e.id}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="rgba(255,255,255,0.8)"
              strokeOpacity={e.opacity}
              strokeWidth={config.lineStrokeWidth}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>

      {/* Responsive vignette to reduce visual noise and guide focus */}
      {config.vignetteCss && (
        <div
          className="absolute inset-0"
          style={{
            background: config.vignetteCss,
            WebkitBackdropFilter: 'blur(0.6px) saturate(110%)',
            backdropFilter: 'blur(0.6px) saturate(110%)',
          }}
        />
      )}

      {/* Stars layer (foreground) */}
      <div className="absolute inset-0">
        {stars.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              boxShadow: `0 0 ${Math.max(2, s.size * 2)}px rgba(255,255,255,0.6)`,
              animation: reduceMotion ? undefined : `twinkle ${config.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes twinkle {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.6); opacity: 1; }
          }
        `}
      </style>
    </div>
  )
})

StarryBackground.displayName = 'StarryBackground'

export default StarryBackground


