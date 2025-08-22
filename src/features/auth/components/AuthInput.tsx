import { useEffect } from 'react'
import type { IdentifierValue } from '@/features/auth/types'

type Props = {
  value: string
  onChange: (raw: string, parsed: IdentifierValue) => void
  placeholder?: string
}

function detect(input: string): IdentifierValue {
  const trimmed = input.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (emailRegex.test(trimmed)) {
    return { kind: 'email', email: trimmed.toLowerCase() }
  }
  return { kind: 'unknown', raw: input }
}

export function AuthInput({ value, onChange, placeholder }: Props) {
  useEffect(() => {
    const parsed = detect(value)
    onChange(value, parsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleRawChange(next: string) {
    onChange(next, detect(next))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/70">Email</label>
      <input
        className="input"
        placeholder={placeholder ?? 'name@company.com'}
        value={value}
        onChange={(e) => handleRawChange(e.target.value)}
        inputMode="email"
        autoComplete="username"
      />
    </div>
  )
}


