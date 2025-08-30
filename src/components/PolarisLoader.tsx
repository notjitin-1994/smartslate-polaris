import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface PolarisLoaderMessage {
  id: string | number
  text: string
  subtext?: string
}

export interface PolarisLoaderProps {
  width?: number
  messages: PolarisLoaderMessage[]
  intervalMs?: number
  onCycleComplete?: () => void
  processingLabel?: string
  loopLogo?: boolean
}

export function PolarisLoader({
  width = 560,
  messages,
  intervalMs = 15000,
  onCycleComplete,
  processingLabel = 'AI Processing',
  loopLogo = false,
}: PolarisLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [logoHidden, setLogoHidden] = useState(false)
  const [logoCycle, setLogoCycle] = useState(0)
  const animationRef = useRef<number | null>(null)

  const currentMessage = useMemo(() => messages[currentIdx % messages.length], [messages, currentIdx])

  // Progress animation for logo fill (visual; not tied to work)
  useEffect(() => {
    let cancelled = false
    const start = performance.now()
    const duration = 16000
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / duration)
      setProgress(96 * easeOut(t))
      if (t < 1) animationRef.current = requestAnimationFrame(tick)
      else setProgress(96)
    }
    animationRef.current = requestAnimationFrame(tick)
    return () => { cancelled = true; if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [logoCycle])

  // Message rotation timer
  useEffect(() => {
    const id = setInterval(() => setCurrentIdx(i => (i + 1) % messages.length), intervalMs)
    return () => clearInterval(id)
  }, [messages.length, intervalMs])

  // Optional looping of the logo fade
  useEffect(() => {
    if (!loopLogo) return
    const id = setInterval(() => {
      setLogoHidden(true)
      setTimeout(() => {
        setProgress(0)
        setLogoCycle(c => c + 1)
        setLogoHidden(false)
        onCycleComplete?.()
      }, 1000)
    }, intervalMs)
    return () => clearInterval(id)
  }, [loopLogo, intervalMs, onCycleComplete])

  return (
    <div className="w-full text-center select-none">
      {/* Logo */}
      <div className="relative mx-auto h-20" style={{ width }}>
        <motion.div className="absolute inset-0" animate={{ opacity: logoHidden ? 0 : 1 }} transition={{ duration: 0.6 }}>
          <div className="absolute inset-0 blur-3xl" style={{ opacity: 0.6 }}>
            <div className="w-full h-full bg-primary-500/30 rounded-full" />
          </div>
          <div
            key={logoCycle}
            className="relative h-full w-full"
            style={{
              WebkitMaskImage: 'url("/images/logos/logo.png")',
              maskImage: 'url("/images/logos/logo.png")',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          >
            <motion.div
              key={`fill-${logoCycle}`}
              className="absolute inset-0"
              style={{ clipPath: `inset(0% ${Math.max(0, 100 - Math.round(progress))}% 0% 0%)` }}
              animate={{ clipPath: `inset(0% ${Math.max(0, 100 - progress)}% 0% 0%)` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />
              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
          </div>
          <motion.img src="/images/logos/logo.png" alt="SmartSlate" className="absolute inset-0 h-full w-full object-contain opacity-20 pointer-events-none select-none" style={{ imageRendering: 'crisp-edges' as any, transform: 'translateZ(0)' }} animate={{ opacity: logoHidden ? 0 : 0.2 }} transition={{ duration: 0.6 }} />
        </motion.div>
      </div>

      {/* Messages */}
      <div className="relative mx-auto overflow-hidden" style={{ width }}>
        <AnimatePresence mode="wait">
          <motion.div key={currentMessage?.id ?? currentIdx} initial={{ opacity: 0, y: -28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="space-y-3 will-change-transform">
            <h2 className="text-3xl font-semibold text-white">{currentMessage?.text}</h2>
            {currentMessage?.subtext && <p className="text-lg text-white/60 max-w-md mx-auto">{currentMessage.subtext}</p>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Processing */}
      <div className="mt-3.5 flex justify-center items-center gap-3">
        <div className="flex gap-1.5">
          {[0,1,2,3].map(i => (
            <motion.div key={i} className="w-2 h-2 bg-primary-400/60 rounded-full" animate={{ y: [0,-8,0], opacity: [0.6,1,0.6] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>
        <span className="text-sm text-white/40">{processingLabel}</span>
      </div>
    </div>
  )
}

export default PolarisLoader


