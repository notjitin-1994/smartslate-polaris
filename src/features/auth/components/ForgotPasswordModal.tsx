import { useState } from 'react'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { IdentifierValue } from '@/features/auth/types'
import * as authService from '@/services/auth/authService'

interface ForgotPasswordModalProps {
  onClose: () => void
  onSuccess: (message: string) => void
}

export function ForgotPasswordModal({ onClose, onSuccess }: ForgotPasswordModalProps) {
  const [identifierRaw, setIdentifierRaw] = useState('')
  const [identifier, setIdentifier] = useState<IdentifierValue>({ kind: 'unknown', raw: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (identifier.kind !== 'email') {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      await authService.resetPassword(identifier.email)
      onSuccess('Password reset link sent! Check your email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[rgb(var(--card))] border border-white/10 rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-lg font-heading font-semibold text-white">
              Reset your password
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              value={identifierRaw}
              onChange={(raw, parsed) => {
                setIdentifierRaw(raw)
                setIdentifier(parsed)
                setError(null)
              }}
              label="Email address"
              placeholder="you@example.com"
            />

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Send reset link'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
