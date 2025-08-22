import { useState } from 'react'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { IdentifierValue } from '@/features/auth/types'
import * as authService from '@/features/auth/services/authService'
import { GoogleOAuthButton } from '@/features/auth/components/GoogleOAuthButton'
import { PasswordInput } from '@/components/PasswordInput'

export function LoginForm() {
  const [identifierRaw, setIdentifierRaw] = useState('')
  const [identifier, setIdentifier] = useState<IdentifierValue>({ kind: 'unknown', raw: '' })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.login({ identifier, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
        placeholder="••••••••"
        autoComplete="current-password"
        name="current-password"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" className="btn-primary w-full pressable" disabled={loading}>
        <span className={loading ? 'opacity-70 animate-pulse-subtle' : ''}>{loading ? 'Signing in…' : 'Login'}</span>
      </button>

      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="bg-[rgb(var(--card))] px-2 relative z-10 text-primary-500">or</span>
        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
      </div>

      <GoogleOAuthButton />
    </form>
  )
}


