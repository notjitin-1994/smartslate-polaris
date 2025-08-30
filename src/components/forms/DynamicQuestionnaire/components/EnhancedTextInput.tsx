import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Link, Calendar, Hash, Type } from 'lucide-react'

interface EnhancedTextInputProps {
  type: 'text' | 'email' | 'url' | 'date' | 'number'
  value: string | number
  onChange: (value: string | number) => void
  onBlur?: () => void
  placeholder?: string
  min?: number
  max?: number
}

export function EnhancedTextInput({ 
  type, 
  value, 
  onChange, 
  onBlur, 
  placeholder,
  min,
  max
}: EnhancedTextInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const getIcon = () => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5" />
      case 'url': return <Link className="w-5 h-5" />
      case 'date': return <Calendar className="w-5 h-5" />
      case 'number': return <Hash className="w-5 h-5" />
      default: return <Type className="w-5 h-5" />
    }
  }

  return (
    <div className="relative group">
      <motion.div
        className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl
          bg-white/10 border-2 transition-all duration-300
          ${isFocused 
            ? 'border-primary-500/50 shadow-lg shadow-primary-500/10' 
            : 'border-white/20 hover:border-white/30 hover:bg-white/15'
          }
        `}
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Icon */}
        <motion.div
          className={`
            flex-shrink-0 transition-colors duration-300
            ${isFocused ? 'text-primary-400' : 'text-white/40 group-hover:text-white/60'}
          `}
          animate={{
            rotate: isFocused ? 360 : 0,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {getIcon()}
        </motion.div>

        {/* Input */}
        <input
          ref={inputRef}
          type={type}
          value={value || ''}
          onChange={(e) => {
            if (type === 'number') {
              onChange(e.target.value ? Number(e.target.value) : '')
            } else {
              onChange(e.target.value)
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            onBlur?.()
          }}
          placeholder={undefined}
          min={min}
          max={max}
          className={`
            flex-1 bg-transparent border-none outline-none
            text-white placeholder-white/40
            ${type === 'date' && '[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-80'}
          `}
        />

        {/* Focus indicator line */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-0.5 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
          initial={{ width: 0, x: '-50%' }}
          animate={{
            width: isFocused ? '100%' : 0,
            x: '-50%'
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </motion.div>

      {/* Floating label effect (optional) */}
      {placeholder && (
        <motion.label
          className={`
            absolute left-12 pointer-events-none transition-all duration-300
            ${(isFocused || value) 
              ? '-top-2 text-xs bg-gray-900 px-2 text-primary-400' 
              : 'top-3.5 text-sm text-white/40'
            }
          `}
          animate={{
            y: (isFocused || value) ? 0 : 0,
          }}
        >
          {placeholder}
        </motion.label>
      )}
    </div>
  )
}
