import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '@/services/supabase'
import { paths } from '@/routes/paths'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    // Ensure Supabase handles the URL hash to set the session
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session) {
        navigate(paths.home, { replace: true })
        return
      }
      // Even if session isn't immediately available, auth.onAuthStateChange will handle it
    })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) navigate(paths.home, { replace: true })
    })
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="opacity-70 animate-fade-in-up">Signing you in…</div>
    </div>
  )
}


