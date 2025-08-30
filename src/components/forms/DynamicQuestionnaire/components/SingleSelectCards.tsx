import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

interface Option {
  value: string
  label: string
  description?: string
}

interface SingleSelectCardsProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

export function SingleSelectCards({ 
  options, 
  value, 
  onChange, 
  onBlur 
}: SingleSelectCardsProps) {
  const OTHER_PREFIX = '__other__::'
  const isOtherValue = typeof value === 'string' && value.startsWith(OTHER_PREFIX)
  const otherText = isOtherValue ? value.slice(OTHER_PREFIX.length) : ''
  const otherInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOtherValue && otherInputRef.current) {
      otherInputRef.current.focus()
    }
  }, [isOtherValue])

  const isOtherOption = (opt: Option) => {
    const v = (opt.value || '').toLowerCase()
    const l = (opt.label || '').toLowerCase()
    return v === 'other' || v === 'others' || l === 'other' || l === 'others'
  }

  return (
    <div className="grid grid-cols-1 gap-3 overflow-x-hidden">
      {options.map((option, index) => {
        const selected = isOtherOption(option)
          ? (isOtherValue || value === option.value)
          : value === option.value

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => {
              if (isOtherOption(option)) {
                // Initialize or keep Other selection
                onChange(isOtherValue ? value : OTHER_PREFIX)
              } else {
                onChange(option.value)
              }
            }}
            onBlur={onBlur}
            className={`
              relative p-4 rounded-xl text-left transition-all duration-300 w-full
              ${selected 
                ? 'bg-gradient-to-r from-secondary-500/20 via-secondary-600/20 to-secondary-700/20 border-2 border-secondary-500/60 shadow-xl shadow-secondary-500/20' 
                : 'bg-white/5 border-2 border-white/20 hover:bg-white/10 hover:border-white/30 hover:shadow-lg'
              }
              group cursor-pointer overflow-hidden
            `}
            whileTap={{ scale: 0.98 }}
            whileHover={index === 0 ? { y: 0 } : { y: -2 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.05,
              ease: "easeOut" 
            }}
          >
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex-1">
                {isOtherOption(option) && selected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">Other:</span>
                    <input
                      ref={otherInputRef}
                      type="text"
                      value={otherText}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')
                        onChange(OTHER_PREFIX + sanitized)
                      }}
                      placeholder="Please specify"
                      className="w-full max-w-xs bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30"
                    />
                  </div>
                ) : (
                  <>
                    <span className={`
                      text-base font-medium transition-colors duration-300
                      ${selected ? 'text-white' : 'text-white/80 group-hover:text-white'}
                   `}>
                      {option.label}
                    </span>
                    {option.description && (
                      <p className={`
                        text-sm mt-1 transition-colors duration-300
                        ${selected ? 'text-white/80' : 'text-white/60 group-hover:text-white/70'}
                     `}>
                        {option.description}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <motion.div
                  animate={{
                    scale: selected ? 1 : 0.8,
                    opacity: selected ? 1 : 0.3,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center
                    ${selected 
                      ? 'bg-secondary-500 border-secondary-500' 
                      : 'bg-transparent border-white/30 group-hover:border-white/50'
                    }
                  `}
                >
                  {selected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Animated background effect */}
            {selected && (
              <motion.div
                className="absolute inset-0 -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary-600/20 rounded-full blur-3xl animate-pulse delay-75" />
                
                {/* Sparkle effect */}
                <motion.div
                  className="absolute top-2 right-8"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Sparkles className="w-4 h-4 text-secondary-400/60" />
                </motion.div>
              </motion.div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
