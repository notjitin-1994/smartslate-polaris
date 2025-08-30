import { useState, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
  placeholder?: string
  maxTags?: number
  suggestions?: string[]
}

export function TagInput({ 
  value = [], 
  onChange, 
  onBlur,
  placeholder = "Type and press Enter to add",
  maxTags,
  suggestions = []
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const canAddMore = !maxTags || value.length < maxTags
  
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  )

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !value.includes(trimmedTag) && canAddMore) {
      onChange([...value, trimmedTag])
      setInputValue('')
      setShowSuggestions(false)
    }
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  return (
    <div className="relative">
      <div className="min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 hover:border-white/30 focus-within:border-primary-500/50 transition-all duration-200">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Tags */}
          <AnimatePresence>
            {value.map((tag, index) => (
              <motion.div
                key={`${tag}-${index}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-500/20 border border-primary-500/40 rounded-full text-sm text-white group hover:bg-primary-500/30 transition-colors"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Input */}
          {canAddMore && (
            <div className="flex-1 min-w-[120px]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setShowSuggestions(true)
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200)
                  onBlur?.()
                }}
                placeholder={value.length === 0 ? placeholder : ''}
                className="w-full bg-transparent border-none outline-none text-white placeholder-white/40"
              />
            </div>
          )}
        </div>

        {/* Tag count indicator */}
        {maxTags && (
          <div className="absolute -top-2 -right-2">
            <motion.div
              className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${value.length >= maxTags 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                }
              `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {value.length}/{maxTags}
            </motion.div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 w-full mt-2 bg-gray-900/95 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="py-2 max-h-48 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="w-full px-4 py-2.5 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-primary-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
