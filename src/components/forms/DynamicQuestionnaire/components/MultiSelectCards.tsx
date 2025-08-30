import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface MultiSelectCardsProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  maxSelections?: number
}

export function MultiSelectCards({ 
  options, 
  value = [], 
  onChange, 
  onBlur,
  maxSelections 
}: MultiSelectCardsProps) {
  const OTHER_PREFIX = '__other__::'
  const isOtherValue = (v: string) => typeof v === 'string' && v.startsWith(OTHER_PREFIX)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const currentOther = value.find(isOtherValue)
  const otherText = currentOther ? currentOther.slice(OTHER_PREFIX.length) : ''

  useEffect(() => {
    if (currentOther && otherInputRef.current) {
      otherInputRef.current.focus()
    }
  }, [currentOther])

  const isOtherOption = (opt: Option) => {
    const v = (opt.value || '').toLowerCase()
    const l = (opt.label || '').toLowerCase()
    return v === 'other' || v === 'others' || l === 'other' || l === 'others'
  }
  const isSelected = (optionValue: string) => value.includes(optionValue)
  const canSelectMore = !maxSelections || value.length < maxSelections

  const toggleOption = (optionValue: string) => {
    if (isSelected(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else if (canSelectMore) {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((option) => {
        const selected = isSelected(option.value)
        const disabled = !selected && !canSelectMore

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => {
              if (isOtherOption(option)) {
                if (!currentOther) {
                  onChange([...value, OTHER_PREFIX])
                }
              } else {
                toggleOption(option.value)
              }
            }}
            onBlur={onBlur}
            disabled={disabled}
            className={`
              relative p-4 rounded-xl text-left transition-all duration-200
              ${selected 
                ? 'bg-gradient-to-br from-secondary-500/20 to-secondary-600/20 border-2 border-secondary-500/50 shadow-lg shadow-secondary-500/10' 
                : disabled
                  ? 'bg-white/5 border-2 border-white/10 opacity-50 cursor-not-allowed'
                  : 'bg-white/5 border-2 border-white/20 hover:bg-white/10 hover:border-white/30 hover:shadow-md'
              }
              ${!disabled && 'cursor-pointer'}
              group
            `}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            whileHover={!disabled ? { y: -2 } : {}}
            initial={false}
            animate={{
              scale: selected ? 1.02 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3">
              {isOtherOption(option) && (selected || currentOther) ? (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-white/70">Other:</span>
                  <input
                    ref={otherInputRef}
                    type="text"
                    value={otherText}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')
                      const withoutOther = value.filter(v => !isOtherValue(v))
                      onChange([...withoutOther, OTHER_PREFIX + sanitized])
                    }}
                    placeholder="Please specify"
                    className="w-full max-w-xs bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30"
                  />
                </div>
              ) : (
                <span className={`
                  text-sm font-medium transition-colors duration-200
                  ${selected ? 'text-white' : 'text-white/80 group-hover:text-white'}
                `}>
                  {option.label}
                </span>
              )}
              
              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex-shrink-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Subtle gradient overlay on hover */}
            <div className={`
              absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300
              ${!disabled && !selected && 'group-hover:opacity-100'}
              bg-gradient-to-br from-white/5 to-transparent pointer-events-none
            `} />
          </motion.button>
        )
      })}
    </div>
  )
}
