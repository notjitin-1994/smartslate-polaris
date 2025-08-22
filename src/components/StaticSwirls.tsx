import { useEffect, useMemo, useState } from 'react'

type Props = {
  imageSrc: string
  count?: number
  minSize?: number
  maxSize?: number
  opacityMin?: number
  opacityMax?: number
  areaPadding?: number
}

type StaticSwirl = {
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

export function StaticSwirls({
  imageSrc,
  count = 120,
  minSize = 22,
  maxSize = 48,
  opacityMin = 0.06,
  opacityMax = 0.12,
  areaPadding = 24,
}: Props) {
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth
      // Use the full document height instead of just viewport height
      const h = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
        window.innerHeight
      )
      setViewport({ width: w, height: h })
    }
    
    measure()
    window.addEventListener('resize', measure)
    
    // Also listen for content changes that might affect height
    const observer = new MutationObserver(() => {
      // Debounce the measure call
      setTimeout(measure, 100)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    })
    
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [])

  const swirls = useMemo<StaticSwirl[]>(() => {
    const { width, height } = viewport
    if (!width || !height) return []

    const rng = createSeededRng(12345) // Fixed seed for consistent layout
    const results: StaticSwirl[] = []
    const maxAttempts = count * 10
    const spacing = 4

    for (let i = 0; i < count && i < maxAttempts; i++) {
      const size = minSize + rng() * (maxSize - minSize)
      const x = areaPadding + rng() * (width - areaPadding * 2)
      const y = areaPadding + rng() * (height - areaPadding * 2)
      const rotation = rng() * 360
      const opacity = opacityMin + rng() * (opacityMax - opacityMin)
      const flip = rng() > 0.5

      // Simple collision detection
      let overlaps = false
      const r = size / 2
      for (const existing of results) {
        const dx = x - existing.x
        const dy = y - existing.y
        const minDist = r + existing.size / 2 + spacing
        if (dx * dx + dy * dy < minDist * minDist) {
          overlaps = true
          break
        }
      }

      if (!overlaps) {
        results.push({ x, y, size, rotation, opacity, flip })
      }
    }

    return results
  }, [viewport, count, minSize, maxSize, opacityMin, opacityMax, areaPadding])

  return (
    <div 
      className="fixed top-0 left-0 z-0 overflow-hidden pointer-events-none"
      style={{
        width: viewport.width,
        height: viewport.height,
      }}
    >
      {swirls.map((swirl, idx) => (
        <img
          key={idx}
          src={imageSrc}
          alt=""
          className="absolute select-none"
          style={{
            left: swirl.x,
            top: swirl.y,
            width: Math.round(swirl.size),
            height: Math.round(swirl.size),
            opacity: swirl.opacity,
            transform: `translate(-50%, -50%) rotate(${swirl.rotation}deg) scaleX(${swirl.flip ? -1 : 1})`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  )
}
