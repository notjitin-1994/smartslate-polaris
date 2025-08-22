import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type Props = {
  imageSrc: string
  count?: number
  minSize?: number
  maxSize?: number
  opacityMin?: number
  opacityMax?: number
  areaPadding?: number
}

type NormalizedSwirl = {
  nx: number
  ny: number
  sizeN: number
  rotN: number
  opN: number
  flip: boolean
}

type PlacedSwirl = {
  x: number
  y: number
  size: number
  rotation: number
  opacity: number
  flip: boolean
}

type Connection = {
  x1: number
  y1: number
  x2: number
  y2: number
  strength: number
}

function createSeededRng(seed: number) {
  let t = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  return function rng() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function SwirlField({
  imageSrc,
  count = 120,
  minSize = 22,
  maxSize = 48,
  opacityMin = 0.06,
  opacityMax = 0.12,
  areaPadding = 24,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const seedRef = useRef(Math.floor(Math.random() * 1_000_000))

  // Pre-generate normalized positions and attributes once for stability
  const normalized = useMemo<NormalizedSwirl[]>(() => {
    const rng = createSeededRng(seedRef.current)
    return Array.from({ length: count }).map(() => ({
      nx: rng(),
      ny: rng(),
      sizeN: rng(),
      rotN: rng(),
      opN: rng(),
      flip: rng() > 0.5,
    }))
  }, [count])

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setViewport({ width: w, height: h })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const placed = useMemo<PlacedSwirl[]>(() => {
    const { width, height } = viewport
    if (!width || !height) return []
    const padX = Math.min(areaPadding, width / 10)
    const padY = Math.min(areaPadding, height / 10)

    // Prepare items with final visual attributes first (size, rotation, opacity)
    const items = normalized.map((n) => ({
      size: minSize + n.sizeN * (maxSize - minSize),
      rotation: n.rotN * 360,
      opacity: opacityMin + n.opN * (opacityMax - opacityMin),
      flip: n.flip,
    }))
    // Place larger first for better packing
    items.sort((a, b) => b.size - a.size)

    const rng = createSeededRng(seedRef.current + 1)
    const results: PlacedSwirl[] = []
    const maxAttemptsPerItem = 100
    const spacing = 4 // extra gap between swirls

    for (const it of items) {
      const r = it.size / 2
      for (let attempt = 0; attempt < maxAttemptsPerItem; attempt++) {
        const x = padX + rng() * (width - padX * 2)
        const y = padY + rng() * (height - padY * 2)
        let overlaps = false
        for (let i = 0; i < results.length; i++) {
          const o = results[i]
          const dx = x - o.x
          const dy = y - o.y
          const minDist = r + o.size / 2 + spacing
          if (dx * dx + dy * dy < minDist * minDist) {
            overlaps = true
            break
          }
        }
        if (!overlaps) {
          results.push({ x, y, size: it.size, rotation: it.rotation, opacity: it.opacity, flip: it.flip })
          break
        }
      }
      if (results.length >= count) break
      // If couldn't place due to density, continue to next smaller swirl
    }

    return results
  }, [viewport, normalized, minSize, maxSize, opacityMin, opacityMax, areaPadding])

  // Create randomized but deterministic connections (2-4 per swirl, within distance)
  const connections = useMemo<Connection[]>(() => {
    const { width, height } = viewport
    if (!width || !height || placed.length === 0) return []

    const rng = createSeededRng(seedRef.current + 2)
    const maxPerNode = 4
    const minPerNode = 2
    const maxDistance = Math.min(width, height) * 0.4
    const maxCandidates = 10

    const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
    const used = new Set<string>()
    const degree = new Array(placed.length).fill(0)
    const out: Connection[] = []

    for (let i = 0; i < placed.length; i++) {
      if (degree[i] >= maxPerNode) continue
      const pi = placed[i]
      // Build candidate neighbor list by distance
      const neighbors: { j: number; d: number }[] = []
      for (let j = 0; j < placed.length; j++) {
        if (j === i) continue
        const pj = placed[j]
        const dx = pi.x - pj.x
        const dy = pi.y - pj.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d <= maxDistance) neighbors.push({ j, d })
      }
      neighbors.sort((a, b) => a.d - b.d)

      const desired = Math.min(
        maxPerNode,
        minPerNode + Math.floor(rng() * 3) // 2-4
      )

      let added = 0
      for (let k = 0; k < neighbors.length && added < desired; k++) {
        const { j, d } = neighbors[k]
        if (degree[j] >= maxPerNode) continue
        const key = edgeKey(i, j)
        if (used.has(key)) continue
        // Randomly skip some neighbors if there are too many very close ones
        if (k > maxCandidates) break
        used.add(key)
        degree[i]++
        degree[j]++
        added++
        const strength = Math.max(0.2, Math.min(1, 1 - d / maxDistance))
        out.push({ x1: pi.x, y1: pi.y, x2: placed[j].x, y2: placed[j].y, strength })
        if (degree[i] >= maxPerNode) break
      }
    }

    return out
  }, [viewport, placed])

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
      {/* Connection lines behind swirls */}
      <svg
        className="absolute inset-0 w-full h-full"
        width={viewport.width}
        height={viewport.height}
        viewBox={`0 0 ${viewport.width || 0} ${viewport.height || 0}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#line-glow)" strokeLinecap="round" fill="none">
          {connections.map((c, i) => (
            <g key={i} stroke={`rgb(var(--primary))`}>
              {/* outer soft glow */}
              <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} strokeOpacity={Math.min(0.5, 0.28 + c.strength * 0.35)} strokeWidth={3.2} />
              {/* crisp core */}
              <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} strokeOpacity={Math.min(0.85, 0.55 + c.strength * 0.35)} strokeWidth={1.2} />
            </g>
          ))}
        </g>
      </svg>

      {placed.map((s, idx) => (
        <img
          key={idx}
          src={imageSrc}
          alt=""
          className="swirl-item absolute select-none"
          style={{
            left: `${s.x}px`,
            top: `${s.y}px`,
            width: `${Math.round(s.size)}px`,
            height: `${Math.round(s.size)}px`,
            opacity: s.opacity,
            ['--t' as any]: `translate(-50%, -50%) rotate(${s.rotation}deg) scaleX(${s.flip ? -1 : 1})`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}


