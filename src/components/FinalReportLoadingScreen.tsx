import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'

interface LoadingMessage {
  id: number
  text: string
  subtext?: string
}

const loadingMessages: LoadingMessage[] = [
  { id: 1, text: 'Synthesizing your insights...', subtext: 'Combining static and dynamic answers' },
  { id: 2, text: 'Shaping your blueprint...', subtext: 'Designing an implementation-ready plan' },
  { id: 3, text: 'Designing visuals...', subtext: 'Timelines, milestones, and risk maps' },
  { id: 4, text: 'Final touches...', subtext: 'Polishing clarity, structure, and tone' },
]

interface FinalReportLoadingScreenProps {
  recordId?: string
  embedded?: boolean
  onComplete?: () => void
  onFail?: (message?: string) => void
  processingLabel?: string
}

export function FinalReportLoadingScreen({ recordId, embedded = false, onComplete, onFail, processingLabel = 'Solara is Igniting the Stars for Polaris' }: FinalReportLoadingScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const cancelAnimationRef = useRef<boolean>(false)
  const [logoHidden, setLogoHidden] = useState(false)
  const [logoCycle, setLogoCycle] = useState(0)
  const lastStatusRef = useRef<string | null>(null)

  // Poll for final_report completion
  useEffect(() => {
    if (!recordId) return

    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('master_discovery')
          .select('final_report, status')
          .eq('id', recordId)
          .single()

        if (!data) return
        const fr = (data as any).final_report
        const hasContent = !!(fr && typeof fr === 'object' && fr?.views?.report?.content)
        const currentStatus = (data as any)?.status ?? null
        if (currentStatus !== lastStatusRef.current) {
          lastStatusRef.current = currentStatus
          setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length)
        }
        if (hasContent && !isComplete) {
          try { setCurrentMessageIndex(loadingMessages.length - 1) } catch {}
          setIsComplete(true)
        } else if ((data as any)?.status === 'failed') {
          if (onFail) onFail('Report generation failed')
        }
      } catch (error) {
        console.error('Error checking final_report status:', error)
        if (onFail) onFail('Network error while checking status')
      }
    }

    checkStatus()
    pollIntervalRef.current = setInterval(checkStatus, 2000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [recordId, isComplete, onComplete])

  // Progress animation similar to DynamicLoadingScreen
  useEffect(() => {
    if (isComplete) return
    cancelAnimationRef.current = false
    const schedule: { target: number; duration: number }[] = [
      { target: 18, duration: 1500 },
      { target: 35, duration: 2200 },
      { target: 57, duration: 2600 },
      { target: 76, duration: 2800 },
      { target: 92, duration: 2600 },
      { target: 97, duration: 2200 },
    ]
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const animateStage = (index: number, fromValue: number) => {
      if (index >= schedule.length || cancelAnimationRef.current || isComplete) return
      const { target, duration } = schedule[index]
      const start = performance.now()
      const startValue = fromValue
      const tick = (now: number) => {
        if (cancelAnimationRef.current || isComplete) return
        const t = Math.min(1, (now - start) / duration)
        const value = startValue + (target - startValue) * easeOutCubic(t)
        setProgress(value)
        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(tick)
        } else {
          if (index + 1 < schedule.length) {
            setTimeout(() => animateStage(index + 1, target), 250)
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    animateStage(0, 0)
    return () => {
      cancelAnimationRef.current = true
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isComplete])

  // Rotate messages
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length)
    }, 15000)
    return () => clearInterval(id)
  }, [])

  // Finish animation
  useEffect(() => {
    if (!isComplete) return
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    cancelAnimationRef.current = true
    const start = performance.now()
    const startValue = Math.min(98, progress)
    const duration = Math.max(800, (100 - startValue) * 20)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const value = startValue + (100 - startValue) * easeOutCubic(t)
      setProgress(value)
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(tick)
      } else {
        setProgress(100)
        setTimeout(() => { if (onComplete) onComplete() }, 300)
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick)
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [isComplete])

  const currentMessage = loadingMessages[currentMessageIndex]

  return (
    <div className={`${embedded ? 'relative inset-auto z-0' : 'fixed inset-0 z-50'} ${embedded ? '' : 'bg-[rgb(var(--bg))]'} flex items-start justify-center overflow-hidden pt-[6vh]`}>
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center w-full">

        <motion.div
          className="mb-3.5 relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative mx-auto h-20" style={{ width: 560 }}>
            <motion.div className="absolute inset-0" animate={{ opacity: logoHidden ? 0 : 1 }} transition={{ duration: 0.6 }}>
              <div className="absolute inset-0 blur-3xl" style={{ opacity: 0.6 }}>
                <div className="w-full h-full bg-primary-500/30 rounded-full" />
              </div>
              <div key={logoCycle} className="relative h-full w-full" style={{ WebkitMaskImage: 'url("/images/logos/logo.png")', maskImage: 'url("/images/logos/logo.png")', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain' }}>
                <motion.div key={`fill-${logoCycle}`} className="absolute inset-0" style={{ clipPath: `inset(0% ${Math.max(0, 100 - Math.round(progress))}% 0% 0%)` }} animate={{ clipPath: `inset(0% ${Math.max(0, 100 - progress)}% 0% 0%)` }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />
                  <motion.div key={`shimmer-${logoCycle}`} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.25), transparent 40%)' }} animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
                </motion.div>
              </div>
              <motion.img src="/images/logos/logo.png" alt="SmartSlate" className="absolute inset-0 h-full w-full object-contain opacity-20 pointer-events-none select-none" style={{ imageRendering: 'crisp-edges' as any, transform: 'translateZ(0)' }} animate={{ opacity: logoHidden ? 0 : 0.2 }} transition={{ duration: 0.6 }} />
            </motion.div>
          </div>
        </motion.div>

        <div className="relative mx-auto overflow-hidden" style={{ width: 560 }}>
          <AnimatePresence mode="wait">
            <motion.div key={currentMessage.id} initial={{ opacity: 0, y: -28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="space-y-3 will-change-transform">
              <h2 className="text-3xl font-semibold text-white">{currentMessage.text}</h2>
              {currentMessage.subtext && (
                <p className="text-lg text-white/60 max-w-md mx-auto">{currentMessage.subtext}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div className="mt-3.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <div className="flex justify-center items-center gap-3" style={{ gap: '0.6rem' }}>
            <div className="flex gap-2" style={{ gap: '0.4rem' }}>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    width: '0.3rem',
                    height: '0.3rem',
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(45,212,191,0.95) 45%, rgba(56,189,248,0.95))',
                    boxShadow: '0 0 10px rgba(45,212,191,0.95), 0 0 24px rgba(56,189,248,0.85), 0 0 48px rgba(56,189,248,0.65)'
                  }}
                  animate={{
                    y: [0, -6.4, 0],
                    opacity: [0.9, 1, 0.9],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <motion.span
              className="text-sm text-white"
              style={{ fontSize: '0.7rem', textShadow: '0 0 6px rgba(45,212,191,0.7), 0 0 18px rgba(56,189,248,0.5)' }}
              animate={{ opacity: [0.9, 1, 0.95] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {processingLabel}
            </motion.span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 2] }} transition={{ duration: 0.8 }}>
              <div className="w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


