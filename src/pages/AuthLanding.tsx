import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthPage } from '@/features/auth/AuthPage'
import SwirlBackground from '@/components/SwirlBackground'
import HeaderSwirlBackground from '@/components/HeaderSwirlBackground'
import { getSupabase } from '@/services/supabase'
import { PolarisPerks } from '@/components/PolarisPerks'
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
      <SwirlBackground />
      <div className="relative z-10 max-w-7xl w-full mx-auto">
        {/* Master container wrapping both sections */}
        <div className={isMobile ? '' : 'glass-card border border-white/10 overflow-hidden p-5 md:p-8'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
        {/* Info card (top) */}
        <section className="w-full flex justify-center lg:justify-start h-full">
          <div className={`p-2 sm:p-3 md:p-4 w-full max-w-xl lg:max-w-none text-left flex flex-col h-full`}>
            <div className="mb-6">
              <div className="inline-flex items-start gap-3">
                <img src="/images/logos/logo.png" alt="Smartslate" className="h-9 md:h-10 lg:h-12 w-auto select-none" />
                <h1 className="text-[0.525rem] md:text-[0.6125rem] lg:text-[0.7rem] font-heading font-bold text-white leading-tight">
                  Polaris
                </h1>
              </div>
              <p className="mt-3 text-white/70 text-base max-w-2xl">
                Turn customer insight into a clear, prioritized roadmap. Align faster. Build smarter.
              </p>
            </div>

            {/* Value chips removed */}

            {/* Public report mockup (moved up to occupy chips space) */}
            <div className="hidden sm:block mt-6 flex-1 min-h-[460px] md:min-h-[520px] lg:min-h-[600px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
              {/* Mock header */}
              <div className="relative border-b border-white/10 bg-[rgb(var(--bg))]/60 backdrop-blur-xl overflow-hidden min-h-[34px] md:min-h-[40px]">
                <HeaderSwirlBackground />
                <div className="relative px-[0.5rem] py-[0.4rem] md:px-[0.6rem] md:py-[0.5rem] z-10 flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    <img src="/images/logos/logo.png" alt="SmartSlate" className="h-[0.8rem] md:h-[0.9rem] w-auto" />
                    <span className="mt-1 font-['Lato'] font-semibold text-primary-400 text-[0.35rem] md:text-[0.4rem]">Polaris Starmaps</span>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <span className="icon-btn icon-btn-primary w-[14px] h-[14px] rounded-full" />
                    <span className="icon-btn w-[14px] h-[14px] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Mock report card (visible on mobile as well) */}
              <div className="block p-4 md:p-6 h-full">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden h-full">
                  <div className="p-4 md:p-6 h-full flex flex-col">
                    {/* Mock report title */}
                    <div className="h-3 w-40 rounded-full bg-white/30 mb-3" />

                    {/* Quick stats row (4 small cards) */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="h-8 rounded-lg bg-white/5 border border-white/10" />
                      <div className="h-8 rounded-lg bg-white/5 border border-white/10" />
                      <div className="h-8 rounded-lg bg-white/5 border border-white/10" />
                      <div className="h-8 rounded-lg bg-white/5 border border-white/10" />
                    </div>

                    {/* Confidence level bar */}
                    <div className="mb-5">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 w-[72%]" />
                      </div>
                      <div className="mt-1 h-2 w-20 rounded-full bg-white/15" />
                    </div>

                    {/* Section header */}
                    <div className="h-3 w-28 rounded-full bg-white/20 mb-2" />

                    {/* Main content skeleton */}
                    <div className="grid grid-cols-3 gap-3 flex-1 items-stretch">
                      <div className="col-span-2 flex flex-col space-y-2 h-full">
                        <div className="h-2 w-4/5 rounded-full bg-white/15" />
                        <div className="h-2 w-3/4 rounded-full bg-white/10" />
                        <div className="flex-1 min-h-[160px] md:min-h-[200px] lg:min-h-[240px] rounded-xl bg-gradient-to-br from-primary-400/15 to-secondary-500/15 border border-white/10" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-10 rounded-lg bg-white/5 border border-white/10" />
                          <div className="h-10 rounded-lg bg-white/5 border border-white/10" />
                        </div>
                      </div>
                      <div className="col-span-1 flex flex-col space-y-2 h-full">
                        <div className="h-2 w-3/4 rounded-full bg-white/15" />
                        <div className="h-2 w-2/3 rounded-full bg-white/10" />
                        <div className="flex-1 min-h-[120px] rounded-xl bg-white/5 border border-white/10" />
                        <div className="flex-1 min-h-[120px] rounded-xl bg-white/5 border border-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Login modal (bottom) */}
        <section className="w-full flex items-stretch justify-center pt-0 sm:pt-1 md:pt-2 pb-6 h-full">
          {/* Unified glow wrapper */}
          <div className="relative w-full max-w-xl lg:max-w-none h-full rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_0_1px_rgba(167,218,219,0.18),0_12px_60px_rgba(167,218,219,0.28),0_8px_24px_rgba(167,218,219,0.18)]">
            {/* Opulent brand teal/indigo glow */}
            <div
              className="pointer-events-none absolute -inset-6 rounded-3xl blur-2xl opacity-75"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(360px 260px at 0% -10%, rgba(167,218,219,0.38), transparent 60%),\\\n                   radial-gradient(420px 300px at 120% 0%, rgba(167,218,219,0.26), transparent 70%)',
                filter: 'saturate(1.05)'
              }}
            />
            <div className="relative h-full flex flex-col px-4 sm:px-5 md:px-6 lg:px-7 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
              <AuthPage />
              <PolarisPerks />
            </div>
          </div>
        </section>
          </div>
        </div>
      </div>
    </div>
  )
}


