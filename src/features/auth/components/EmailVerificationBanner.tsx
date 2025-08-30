import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSupabase } from '@/services/supabase'

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't show if no user or email is already verified
  if (!user || user.email_confirmed_at) {
    return null
  }

  const handleResendVerification = async () => {
    if (!user.email) return

    setSending(true)
    setError(null)
    setSent(false)

    try {
      // Use Supabase's resend confirmation email
      const { error } = await getSupabase().auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) throw error

      setSent(true)
      // Hide success message after 5 seconds
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/10 border-b border-yellow-500/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-sm text-white">
              <span className="font-medium">Please verify your email address.</span>
              {' '}Check your inbox for a verification link.
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sent && (
              <span className="text-sm text-emerald-400 animate-fade-in">
                ✓ Email sent!
              </span>
            )}
            {error && (
              <span className="text-sm text-red-400 animate-fade-in">
                {error}
              </span>
            )}
            <button
              onClick={handleResendVerification}
              disabled={sending || sent}
              className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
