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

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
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
            // Dynamic transform via CSS var so hover can compose scale smoothly
            ['--t' as any]: `translate(-50%, -50%) rotate(${s.rotation}deg) scaleX(${s.flip ? -1 : 1})`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}


