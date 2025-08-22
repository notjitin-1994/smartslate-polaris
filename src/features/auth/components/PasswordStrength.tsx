import { useMemo } from 'react'

type Props = {
  value: string
}

type StrengthInfo = {
  score: number // 0-6
  label: 'Weak' | 'Medium' | 'Strong' | 'Very strong'
  percent: number // 0-100
  barClass: string
  textClass: string
}

function evaluateStrength(pw: string): StrengthInfo {
  if (!pw) {
    return { score: 0, label: 'Weak', percent: 0, barClass: 'bg-red-500', textClass: 'text-red-400' }
  }

  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/[a-z]/.test(pw)) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1

  const lower = pw.toLowerCase()
  const common = ['password', 'letmein', 'qwerty', '123456', 'iloveyou']
  if (common.some((w) => lower.includes(w)) || /(0123|1234|2345|3456|4567|5678|6789)/.test(pw)) {
    score = Math.min(score, 2)
  }

  score = Math.max(0, Math.min(6, score))
  const percent = Math.round((score / 6) * 100)

  let label: StrengthInfo['label'] = 'Weak'
  let barClass = 'bg-red-500'
  let textClass = 'text-red-400'
  if (score >= 3 && score <= 4) {
    label = 'Medium'
    barClass = 'bg-amber-400'
    textClass = 'text-amber-300'
  }
  if (score === 5) {
    label = 'Strong'
    barClass = 'bg-green-500'
    textClass = 'text-green-400'
  }
  if (score >= 6) {
    label = 'Very strong'
    barClass = 'bg-emerald-500'
    textClass = 'text-emerald-400'
  }

  return { score, label, percent, barClass, textClass }
}

export function PasswordStrength({ value }: Props) {
  const info = useMemo(() => evaluateStrength(value), [value])

  if (!value) return null

  return (
    <div className="mt-1 space-y-1" aria-live="polite">
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full ${info.barClass} transition-all duration-300 rounded-full`}
          style={{ width: `${info.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">Password strength</span>
        <span className={`${info.textClass}`}>{info.label}</span>
      </div>
    </div>
  )
}

export default PasswordStrength


