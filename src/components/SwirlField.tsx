import { useEffect, useMemo, useRef, useState, useCallback, memo, type CSSProperties } from 'react'

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
  a: number
  b: number
  strength: number
}

// Optimized seeded RNG with better performance
function createSeededRng(seed: number) {
  let t = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  return function rng() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// Memoized SwirlField component for better performance
export const SwirlField = memo(({
  imageSrc,
  count = 120,
  minSize = 22,
  maxSize = 48,
  opacityMin = 0.06,
  opacityMax = 0.12,
  areaPadding = 24,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const seedRef = useRef(Math.floor(Math.random() * 1_000_000))
  const swirlRefs = useRef<(HTMLImageElement | null)[]>([])
  const lineGlowRefs = useRef<(SVGLineElement | null)[]>([])
  const lineCoreRefs = useRef<(SVGLineElement | null)[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

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

  // Optimize viewport measurement with debouncing
  const updateViewport = useCallback(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    setViewport({ width: w, height: h })
  }, [])

  useEffect(() => {
    updateViewport()
    
    // Use passive event listener for better performance
    window.addEventListener('resize', updateViewport, { passive: true })
    return () => window.removeEventListener('resize', updateViewport)
  }, [updateViewport])

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
    const maxAttemptsPerItem = 50 // Reduced from 100 for better performance
    const spacing = 4 // extra gap between swirls

    for (const it of items) {
      const r = it.size / 2
      for (let attempt = 0; attempt < maxAttemptsPerItem; attempt++) {
        const x = padX + rng() * (width - padX * 2)
        const y = padY + rng() * (height - padY * 2)
        let overlaps = false
        
        // Optimize collision detection with early exit
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
    }

    return results
  }, [viewport, normalized, minSize, maxSize, opacityMin, opacityMax, areaPadding, count])

  // Create randomized but deterministic connections (2-4 per swirl, within distance)
  const connections = useMemo<Connection[]>(() => {
    const { width, height } = viewport
    if (!width || !height || placed.length === 0) return []

    const rng = createSeededRng(seedRef.current + 2)
    const maxPerNode = 2
    const minPerNode = 2
    const maxDistance = Math.min(width, height) * 0.4
    const maxCandidates = 8 // Reduced from 10 for better performance

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

      const desired = Math.min(maxPerNode, minPerNode + Math.floor(rng() * 3))

      let added = 0
      for (let k = 0; k < neighbors.length && added < desired; k++) {
        const { j, d } = neighbors[k]
        if (degree[j] >= maxPerNode) continue
        const key = edgeKey(i, j)
        if (used.has(key)) continue
        if (k > maxCandidates) break
        
        used.add(key)
        degree[i]++
        degree[j]++
        added++
        const strength = Math.max(0.2, Math.min(1, 1 - d / maxDistance))
        out.push({ a: i, b: j, strength })
        if (degree[i] >= maxPerNode) break
      }
    }

    return out
  }, [viewport, placed])

  // Optimized animation with better performance
  useEffect(() => {
    const { width, height } = viewport
    if (!width || !height || placed.length === 0) return

    const n = placed.length
    const rng = createSeededRng(seedRef.current + 3)

    // Use TypedArrays for better performance
    const posX = new Float32Array(n)
    const posY = new Float32Array(n)
    const angle = new Float32Array(n)
    const speed = new Float32Array(n)
    const turn = new Float32Array(n)
    const radius = new Float32Array(n)
    const speedPhase = new Float32Array(n)
    const speedFreq = new Float32Array(n)
    const driftPhase = new Float32Array(n)
    const driftFreq = new Float32Array(n)

    // Initialize arrays
    for (let i = 0; i < n; i++) {
      posX[i] = placed[i].x
      posY[i] = placed[i].y
      angle[i] = rng() * Math.PI * 2
      speed[i] = 4 + rng() * 6 // Reduced speed for better performance
      turn[i] = (rng() * 2 - 1) * 0.1 // Reduced turn rate
      radius[i] = placed[i].size / 2
      speedPhase[i] = rng() * Math.PI * 2
      speedFreq[i] = 0.15 + rng() * 0.3 // Reduced frequency
      driftPhase[i] = rng() * Math.PI * 2
      driftFreq[i] = 0.03 + rng() * 0.1 // Reduced drift frequency
    }

    // Prepare element styles once
    for (let i = 0; i < n; i++) {
      const el = swirlRefs.current[i]
      if (el) {
        el.style.transition = 'transform 0s'
        el.style.willChange = 'transform'
      }
    }

    const marginExtra = 8
    let frameCount = 0

    const step = (ts: number) => {
      // Limit to 30 FPS for better performance
      if (ts - lastFrameTimeRef.current < 33) {
        animationFrameRef.current = requestAnimationFrame(step)
        return
      }
      
      lastFrameTimeRef.current = ts
      frameCount++

      const dt = Math.min(0.033, (ts - lastFrameTimeRef.current) / 1000)
      const tSec = ts / 1000

      // Update swirl positions
      for (let i = 0; i < n; i++) {
        const sp = speed[i] * (0.9 + 0.2 * Math.sin(speedPhase[i] + tSec * 2 * Math.PI * speedFreq[i]))
        const drift = Math.sin(driftPhase[i] + tSec * 2 * Math.PI * driftFreq[i])
        angle[i] += (turn[i] * 0.15 + drift * 0.08) * dt
        posX[i] += Math.cos(angle[i]) * sp * dt
        posY[i] += Math.sin(angle[i]) * sp * dt

        // Wrap around edges
        const wrapMargin = radius[i] + marginExtra
        if (posX[i] < -wrapMargin) posX[i] = width + wrapMargin
        else if (posX[i] > width + wrapMargin) posX[i] = -wrapMargin
        if (posY[i] < -wrapMargin) posY[i] = height + wrapMargin
        else if (posY[i] > height + wrapMargin) posY[i] = -wrapMargin

        // Update DOM only every few frames for better performance
        if (frameCount % 2 === 0) {
          const el = swirlRefs.current[i]
          if (el) {
            const transform = `translate3d(${posX[i].toFixed(1)}px, ${posY[i].toFixed(1)}px, 0) translate(-50%, -50%) rotate(${placed[i].rotation}deg) scaleX(${placed[i].flip ? -1 : 1})`
            el.style.setProperty('--t', transform)
          }
        }
      }

      // Update connection lines less frequently for better performance
      if (frameCount % 3 === 0) {
        const cx = width / 2
        const cy = height / 2
        for (let k = 0; k < connections.length; k++) {
          const c = connections[k]
          const x1 = posX[c.a]
          const y1 = posY[c.a]
          const x2 = posX[c.b]
          const y2 = posY[c.b]

          const midx = (x1 + x2) / 2
          const midy = (y1 + y2) / 2
          const dx = midx - cx
          const dy = midy - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = Math.sqrt(cx * cx + cy * cy)
          const centerFactor = Math.min(1, Math.max(0.6, dist / maxDist))
          const glowOpacity = Math.min(0.5, (0.28 + c.strength * 0.35) * centerFactor)
          const coreOpacity = Math.min(0.85, (0.55 + c.strength * 0.35) * centerFactor)

          const g = lineGlowRefs.current[k]
          if (g) {
            g.setAttribute('x1', x1.toFixed(1))
            g.setAttribute('y1', y1.toFixed(1))
            g.setAttribute('x2', x2.toFixed(1))
            g.setAttribute('y2', y2.toFixed(1))
            g.setAttribute('stroke-opacity', glowOpacity.toFixed(3))
          }
          const core = lineCoreRefs.current[k]
          if (core) {
            core.setAttribute('x1', x1.toFixed(1))
            core.setAttribute('y1', y1.toFixed(1))
            core.setAttribute('x2', x2.toFixed(1))
            core.setAttribute('y2', y2.toFixed(1))
            core.setAttribute('stroke-opacity', coreOpacity.toFixed(3))
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)
    
    // Proper cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [viewport, placed, connections])

  // Memoize SVG connections to prevent unnecessary re-renders
  const svgConnections = useMemo(() => (
    <g filter="url(#line-glow)" strokeLinecap="round" fill="none">
      {connections.map((c, i) => {
        const p1 = placed[c.a]
        const p2 = placed[c.b]
        const cx = viewport.width / 2
        const cy = viewport.height / 2
        const midx = (p1.x + p2.x) / 2
        const midy = (p1.y + p2.y) / 2
        const dx = midx - cx
        const dy = midy - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.sqrt(cx * cx + cy * cy)
        const centerFactor = Math.min(1, Math.max(0.6, dist / maxDist))
        const glowOpacity = Math.min(0.5, (0.28 + c.strength * 0.35) * centerFactor)
        const coreOpacity = Math.min(0.85, (0.55 + c.strength * 0.35) * centerFactor)
        
        return (
          <g key={i} stroke={`rgb(var(--primary))`}>
            <line 
              ref={(el) => { lineGlowRefs.current[i] = el }} 
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
              strokeOpacity={glowOpacity} 
              strokeWidth={1.28} 
            />
            <line 
              ref={(el) => { lineCoreRefs.current[i] = el }} 
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
              strokeOpacity={coreOpacity} 
              strokeWidth={0.48} 
            />
          </g>
        )
      })}
    </g>
  ), [connections, placed, viewport.width, viewport.height])

  // Memoize swirl elements to prevent unnecessary re-renders
  const swirlElements = useMemo(() => (
    placed.map((s, idx) => (
      <img
        key={idx}
        src={imageSrc}
        alt=""
        ref={(el) => { swirlRefs.current[idx] = el }}
        className="swirl-item absolute select-none z-10"
        style={{
          left: `0px`,
          top: `0px`,
          width: `${Math.round(s.size)}px`,
          height: `${Math.round(s.size)}px`,
          opacity: s.opacity,
          ['--t' as any]: `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${s.rotation}deg) scaleX(${s.flip ? -1 : 1})`,
        } as CSSProperties}
      />
    ))
  ), [placed, imageSrc])

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
      {/* Connection lines behind swirls */}
      <svg
        className="absolute inset-0 w-full h-full z-0"
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
        {svgConnections}
      </svg>

      {swirlElements}
    </div>
  )
})

SwirlField.displayName = 'SwirlField'


