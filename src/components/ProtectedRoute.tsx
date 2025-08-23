import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getSupabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'

export function ProtectedRoute() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Check current session
    getSupabase()
      .auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })

    // Listen for auth changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="opacity-70 animate-fade-in-up">Checking authentication...</div>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Render the protected content
  return <Outlet />
}
