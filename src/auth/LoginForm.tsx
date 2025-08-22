import { useState } from 'react'
import { AuthInput } from './AuthInput'
import type { IdentifierValue } from './AuthInput'
import { authApi } from './authApi'

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
      await authApi.login({ identifier, password })
    } catch (err) {
      setError('Unable to login. This is a frontend-only placeholder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthInput
        value={identifierRaw}
        onChange={(raw, parsed) => {
          setIdentifierRaw(raw)
          setIdentifier(parsed)
        }}
      />
      <div className="space-y-2">
        <label className="block text-sm text-white/70">Password</label>
        <input
          className="input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Login'}
      </button>

      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="bg-[rgb(var(--card))] px-2 relative z-10">or</span>
        <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
      </div>

      <authApi.GoogleButton />
    </form>
  )
}


