import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'

interface EnhancedTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  rows?: number
  maxLength?: number
}

export function EnhancedTextarea({ 
  value, 
  onChange, 
  onBlur, 
  placeholder,
  rows = 4,
  maxLength
}: EnhancedTextareaProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = value?.length || 0
  const charPercentage = maxLength ? (charCount / maxLength) * 100 : 0

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const getCharCountColor = () => {
    if (charPercentage >= 90) return 'text-red-400'
    if (charPercentage >= 75) return 'text-yellow-400'
    return 'text-white/40'
  }

  return (
    <div className="relative group">
      <motion.div
        className={`
          relative px-4 py-3 rounded-xl
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
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className={`
              flex-shrink-0 transition-colors duration-300
              ${isFocused ? 'text-primary-400' : 'text-white/40 group-hover:text-white/60'}
            `}
            animate={{
              rotate: isFocused ? [0, -10, 10, -10, 0] : 0,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <MessageSquare className="w-5 h-5" />
          </motion.div>
          
          {placeholder && !value && (
            <span className="text-sm text-white/40">{placeholder}</span>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            onBlur?.()
          }}
          rows={rows}
          maxLength={maxLength}
          className={`
            w-full bg-transparent border-none outline-none resize-none
            text-white placeholder-white/40 min-h-[100px]
            scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent
          `}
          style={{ overflow: 'hidden' }}
        />

        {/* Character count */}
        {maxLength && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1">
              <motion.div
                className="h-1 bg-white/10 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className={`
                    h-full rounded-full transition-colors duration-300
                    ${charPercentage >= 90 
                      ? 'bg-gradient-to-r from-red-400 to-red-500' 
                      : charPercentage >= 75
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                        : 'bg-gradient-to-r from-primary-400 to-primary-600'
                    }
                  `}
                  initial={{ width: 0 }}
                  animate={{ width: `${charPercentage}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </motion.div>
            </div>
            
            <motion.span
              className={`ml-3 text-xs font-medium transition-colors duration-300 ${getCharCountColor()}`}
              key={charCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {charCount}/{maxLength}
            </motion.span>
          </div>
        )}

        {/* Focus indicator */}
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
    </div>
  )
}
