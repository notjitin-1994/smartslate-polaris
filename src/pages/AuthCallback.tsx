import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '@/services/supabase'
import { paths } from '@/routes/paths'
import { crossDomainAuth } from '@/services/auth/crossDomainAuth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    let isMounted = true
    
    // Check if remember me was enabled
    const rememberMe = searchParams.get('remember_me') === 'true'
    
    // Ensure Supabase handles the URL hash to set the session
    // Ensure Supabase processes the URL fragment; then read the session
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      if (session) {
        // Store session with remember me preference
        await crossDomainAuth.storeSession(session, rememberMe)
        try {
          const stored = sessionStorage.getItem('redirectAfterLogin')
          if (stored) {
            const from = JSON.parse(stored)
            const pathname = from?.pathname || '/'
            const search = from?.search || ''
            const hash = from?.hash || ''
            sessionStorage.removeItem('redirectAfterLogin')
            navigate(`${pathname}${search}${hash}`, { replace: true })
          } else {
            navigate(paths.home, { replace: true })
          }
        } catch {
          navigate(paths.home, { replace: true })
        }
        return
      }
      // Even if session isn't immediately available, auth.onAuthStateChange will handle it
    })
    
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_IN' && session) {
        // Store session with remember me preference
        await crossDomainAuth.storeSession(session, rememberMe)
        try {
          const stored = sessionStorage.getItem('redirectAfterLogin')
          if (stored) {
            const from = JSON.parse(stored)
            const pathname = from?.pathname || '/'
            const search = from?.search || ''
            const hash = from?.hash || ''
            sessionStorage.removeItem('redirectAfterLogin')
            navigate(`${pathname}${search}${hash}`, { replace: true })
          } else {
            navigate(paths.home, { replace: true })
          }
        } catch {
          navigate(paths.home, { replace: true })
        }
      }
    })
    
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#020C1B] to-[#0A1628] text-white">
      <div className="text-center animate-fade-in-up">
        <div className="w-16 h-16 mx-auto mb-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        <p className="text-lg font-medium text-white/80">Completing sign in...</p>
        <p className="mt-2 text-sm text-white/60">You'll be redirected in a moment</p>
      </div>
    </div>
  )
}


