import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface EnhancedSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
}

export function EnhancedSelect({ 
  options, 
  value, 
  onChange, 
  onBlur,
  placeholder = "Select an option"
}: EnhancedSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const OTHER_PREFIX = '__other__::'
  const isOtherValue = typeof value === 'string' && value.startsWith(OTHER_PREFIX)
  const otherText = isOtherValue ? value.slice(OTHER_PREFIX.length) : ''

  const selectedOption = options.find(opt => opt.value === value)
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOtherValue && otherInputRef.current) {
      otherInputRef.current.focus()
    }
  }, [isOtherValue])

  const handleSelect = (optionValue: string) => {
    const lower = optionValue.toLowerCase()
    if (lower === 'other' || lower === 'others') {
      onChange(OTHER_PREFIX)
    } else {
      onChange(optionValue)
    }
    setIsOpen(false)
    setSearchTerm('')
    onBlur?.()
  }

  return (
    <div ref={selectRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 rounded-xl text-left transition-all duration-200
          bg-white/10 border-2 flex items-center justify-between gap-3
          ${isOpen 
            ? 'border-primary-500/50 shadow-lg shadow-primary-500/10' 
            : 'border-white/20 hover:border-white/30 hover:bg-white/15'
          }
          group
        `}
      >
        <span className={`${(selectedOption || isOtherValue) ? 'text-white' : 'text-white/60'}`}>
          {isOtherValue ? `Other: ${otherText || ''}` : (selectedOption?.label || placeholder)}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-white/60 group-hover:text-white/80" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="p-3 border-b border-white/10">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-y-auto py-2">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-white/40 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value
                  
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full px-4 py-3 text-left flex items-center justify-between gap-3
                        transition-all duration-200 group
                        ${isSelected 
                          ? 'bg-primary-500/20 text-white' 
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }
                      `}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="w-5 h-5 text-primary-400" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })
              )}
              {/* Inline Other input when value is OTHER */}
              {isOtherValue && (
                <div className="px-4 pb-3">
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-white/70">Other:</span>
                    <input
                      ref={otherInputRef}
                      type="text"
                      value={otherText}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')
                        onChange(OTHER_PREFIX + sanitized)
                      }}
                      placeholder="Please specify"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
