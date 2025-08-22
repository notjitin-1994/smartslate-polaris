import { useState } from 'react'
import { getSupabase } from '@/services/supabase'
import { env } from '@/config/env'

export function GoogleOAuthButton() {
  const [loading, setLoading] = useState(false)
  async function onClick() {
    try {
      setLoading(true)
      const redirectTo = env.googleRedirectUrl || `${window.location.origin}/auth/callback`
      const { data, error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 rounded-xl px-4 py-3 text-sm font-medium transition pressable"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.818C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.191l-6.192-5.238C29.211,35.091,26.715,36,24,36 c-5.192,0-9.598-3.317-11.247-7.946l-6.513,5.02C9.54,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.093,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.192,5.238C36.961,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      <span className={loading ? 'opacity-70 animate-pulse-subtle' : ''}>{loading ? 'Connecting…' : 'Continue with Google'}</span>
    </button>
  )
}


