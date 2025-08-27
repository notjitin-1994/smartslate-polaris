import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthPage } from '@/features/auth/AuthPage'
import AnimatedSwirlBackground from '@/components/AnimatedSwirlBackground'
import HeaderSwirlBackground from '@/components/HeaderSwirlBackground'
import { getSupabase } from '@/services/supabase'
import { paths } from '@/routes/paths'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AuthLanding() {
  const navigate = useNavigate()
  useDocumentTitle('Login to Smartslate')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    let isMounted = true
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) navigate(paths.home, { replace: true })
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) navigate(paths.home, { replace: true })
    })
    return () => {
      isMounted = false
      subscription.unsubscribe()
      mq.removeEventListener?.('change', onChange)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] relative overflow-x-hidden w-full px-2 md:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center">
      <AnimatedSwirlBackground />
      <div className="relative z-10 max-w-7xl w-full mx-auto">
        {/* Master container wrapping both sections */}
        <div className={isMobile ? '' : 'glass-card border border-white/10 overflow-hidden p-5 md:p-8'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 sm:gap-6 lg:gap-10 items-center">
        {/* Left: Minimal hero (Claude-like) */}
        <section className="order-2 lg:order-1 w-full flex justify-center lg:justify-start">
          <div className={`${isMobile ? 'glass-card border border-white/10 p-4' : ''} p-2 sm:p-3 md:p-4 w-full max-w-xl text-left`}>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                Polaris Starmaps
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
                Your product north star
              </h1>
              <p className="mt-3 text-white/70 text-base max-w-2xl">
                Turn customer insight into a clear, prioritized roadmap. Align faster. Build smarter.
              </p>
            </div>

            {/* Compact value chips */}
            <div className="hidden sm:flex flex-wrap gap-2.5 mb-8">
              {[
                'Guided discovery',
                'AI-assisted reports',
                'Impact-first priorities',
                'Shareable public views',
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80">
                  <svg className="w-3.5 h-3.5 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {label}
                </span>
              ))}
            </div>

            {/* Public report mockup (expanded) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
              {/* Mock header */}
              <div className="relative border-b border-white/10 bg-[rgb(var(--bg))]/60 backdrop-blur-xl overflow-hidden min-h-[84px] md:min-h-[100px]">
                <HeaderSwirlBackground />
                <div className="relative px-5 py-4 md:px-6 md:py-5 z-10 flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    <img src="/images/logos/logo.png" alt="SmartSlate" className="h-8 md:h-9 w-auto" />
                    <span className="mt-1 font-['Lato'] font-semibold text-primary-400 text-sm md:text-base">Polaris Starmaps</span>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <span className="icon-btn icon-btn-primary w-9 h-9 rounded-full" />
                    <span className="icon-btn w-9 h-9 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Mock report card (visible on mobile as well) */}
              <div className="block p-4 md:p-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                  <div className="p-4 md:p-6">
                    <div className="h-3 w-40 rounded-full bg-white/30 mb-4" />
                    <div className="space-y-2 mb-5">
                      <div className="h-2 w-5/6 rounded-full bg-white/20" />
                      <div className="h-2 w-2/3 rounded-full bg-white/15" />
                      <div className="h-2 w-3/4 rounded-full bg-white/15" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-2">
                        <div className="h-2 w-4/5 rounded-full bg-white/15" />
                        <div className="h-2 w-3/4 rounded-full bg-white/10" />
                        <div className="h-24 rounded-xl bg-gradient-to-br from-primary-400/15 to-secondary-500/15 border border-white/10" />
                      </div>
                      <div className="col-span-1 space-y-2">
                        <div className="h-2 w-3/4 rounded-full bg-white/15" />
                        <div className="h-2 w-2/3 rounded-full bg-white/10" />
                        <div className="h-16 rounded-xl bg-white/5 border border-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Login modal */}
        <section className="order-1 lg:order-2 w-full flex items-center justify-center min-h-[70vh] sm:min-h-0 py-6">
          <div className="w-full max-w-sm md:max-w-sm lg:max-w-md">
            <AuthPage />
          </div>
        </section>
          </div>
        </div>
      </div>
    </div>
  )
}


