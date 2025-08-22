import { useState } from 'react'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { IdentifierValue } from '@/features/auth/types'
import * as authService from '@/features/auth/services/authService'
import { GoogleOAuthButton } from '@/features/auth/components/GoogleOAuthButton'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrength } from '@/features/auth/components/PasswordStrength'

export function SignUpForm() {
  const [identifierRaw, setIdentifierRaw] = useState('')
  const [identifier, setIdentifier] = useState<IdentifierValue>({ kind: 'unknown', raw: '' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authService.signup({ identifier, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 animate-fade-in-up">
      <AuthInput
        value={identifierRaw}
        onChange={(raw, parsed) => {
          setIdentifierRaw(raw)
          setIdentifier(parsed)
        }}
      />
      <PasswordInput
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Create a strong password"
        autoComplete="new-password"
        name="new-password"
      />
      <PasswordStrength value={password} />
      <PasswordInput
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Repeat password"
        autoComplete="new-password"
        name="confirm-password"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" className="btn-primary w-full pressable" disabled={loading}>
        <span className={loading ? 'opacity-70 animate-pulse-subtle' : ''}>{loading ? 'Creating account…' : 'Sign Up'}</span>
      </button>

      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="bg-[rgb(var(--card))] px-2 relative z-10 text-primary-500">or</span>
        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
      </div>

      <GoogleOAuthButton />
    </form>
  )
}


