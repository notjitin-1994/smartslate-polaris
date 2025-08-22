import { useEffect } from 'react'

export type IdentifierValue =
  | { kind: 'email'; email: string }
  | { kind: 'unknown'; raw: string }

type Props = {
  value: string
  onChange: (raw: string, parsed: IdentifierValue) => void
  placeholder?: string
}

function detect(input: string): IdentifierValue {
  const trimmed = input.trim()
  // Simple email detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (emailRegex.test(trimmed)) {
    return { kind: 'email', email: trimmed.toLowerCase() }
  }

  // Phone: must start with + followed by digits
  if (/^\+\d{1,15}$/.test(trimmed)) {
    try {
      const phone = parsePhoneNumberFromString(trimmed)
      if (phone && phone.isValid()) {
        return {
          kind: 'phone',
          countryCode: `+${phone.countryCallingCode}`,
          national: phone.nationalNumber,
          e164: phone.number,
        }
      }
    } catch {}
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


