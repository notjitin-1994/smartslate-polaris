import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  id?: string
}

export function ChipInput({ value, onChange, placeholder, id }: ChipInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip()
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last chip if backspace pressed with empty input
      removeChip(value.length - 1)
    }
  }

  const addChip = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  const removeChip = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div 
      className="input flex flex-wrap gap-2 items-center min-h-[48px] cursor-text"
      onClick={() => document.getElementById(id || 'chip-input')?.focus()}
    >
      {value.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm motion-safe:animate-fade-in-up"
        >
          {chip}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeChip(index)
            }}
            className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
            aria-label={`Remove ${chip}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id || 'chip-input'}
        type="text"
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder-white/40"
        placeholder={value.length === 0 ? placeholder : ''}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addChip}
      />
    </div>
  )
}
