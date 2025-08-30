import { useState } from 'react'
import { getSupabase } from '@/services/supabase'
import { getAuthRedirectUrl } from '@/utils/domainUtils'
import { useAuth } from '@/contexts/AuthContext'

interface GoogleOAuthButtonProps {
  onError?: (error: string) => void
}

export function GoogleOAuthButton({ onError }: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const { rememberMe } = useAuth()
  
  async function onClick() {
    try {
      setLoading(true)
      const redirectTo = getAuthRedirectUrl()
      
      // Pass remember me preference through state
      const { data, error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${redirectTo}?remember_me=${rememberMe}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Pass remember me preference through state parameter
          scopes: undefined,
          skipBrowserRedirect: false,
        },
      })
      
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      if (onError) {
        onError(message)
      } else {
        // eslint-disable-next-line no-alert
        alert(message)
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 pressable group relative overflow-hidden"
    >
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={`h-5 w-5 transition-transform duration-200 ${loading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.818C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.191l-6.192-5.238C29.211,35.091,26.715,36,24,36 c-5.192,0-9.598-3.317-11.247-7.946l-6.513,5.02C9.54,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.093,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.192,5.238C36.961,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      
      <span className={`relative z-10 ${loading ? 'opacity-70' : ''}`}>
        {loading ? 'Connecting to Google...' : 'Continue with Google'}
      </span>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-xl">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </button>
  )
}


