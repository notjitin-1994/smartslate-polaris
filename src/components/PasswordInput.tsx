import { useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  name?: string
}

function IconEye({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" />
      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4.1c7 0 10.5 7 10.5 7a19.7 19.7 0 0 1-4.1 4.9" />
      <path d="M6.1 6.7C3.7 8.5 2 11.1 2 11.1s3.5 7 10.5 7c1.5 0 2.9-.3 4.1-.8" />
    </svg>
  )
}

export function PasswordInput({ label, value, onChange, placeholder, autoComplete, name }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/70">{label}</label>
      <div className="relative group animate-fade-in-up">
        <input
          className="input pr-12"
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          name={name}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-md inline-flex items-center justify-center text-white/60 hover:text-white transition-colors pressable"
          title={visible ? 'Hide password' : 'Show password'}
        >
          <span className={`transition-opacity duration-200 ${visible ? 'opacity-0' : 'opacity-100'}`}>
            <IconEye className="h-5 w-5" />
          </span>
          <span className={`absolute transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <IconEyeOff className="h-5 w-5" />
          </span>
        </button>
      </div>
    </div>
  )
}


