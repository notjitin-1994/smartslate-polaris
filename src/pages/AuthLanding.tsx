import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthPage } from '@/features/auth/AuthPage'
import { SwirlField } from '@/components/SwirlField'
import { getSupabase } from '@/services/supabase'
import { paths } from '@/routes/paths'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AuthLanding() {
  const navigate = useNavigate()
  useDocumentTitle('Login to Smartslate')

  useEffect(() => {
    let isMounted = true
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) navigate(paths.portal, { replace: true })
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) navigate(paths.portal, { replace: true })
    })
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  // Responsive swirl count: 40% of original on desktop, 32% on mobile
  const originalCount = 128
  const computeSwirlCount = () => {
    const w = window.innerWidth
    const desktopCount = Math.round(originalCount * 0.4)
    const mobileCount = Math.round(originalCount * 0.32)
    return w < 768 ? mobileCount : desktopCount
  }
  const [swirlCount, setSwirlCount] = useState<number>(computeSwirlCount())
  useEffect(() => {
    const onResize = () => setSwirlCount(computeSwirlCount())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-2 md:px-3 lg:px-3 py-6 md:py-8 bg-slate-950 relative overflow-hidden">
      {/* Center halo & edge vignette for focus */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(60% 40% at 50% 50%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.00) 55%)'
        }} />
        <div className="absolute inset-0" style={{
          boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.65)'
        }} />
      </div>
      <SwirlField imageSrc="/images/logos/logo-swirl.png" count={swirlCount} minSize={24} maxSize={56} opacityMin={1} opacityMax={1} />
      <div className="page-enter animate-fade-in-up animate-delay-75 w-full">
        <AuthPage />
      </div>
    </div>
  )
}


