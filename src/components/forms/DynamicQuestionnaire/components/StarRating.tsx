import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  onBlur?: () => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  labels?: string[]
}

export function StarRating({ 
  value = 0, 
  onChange, 
  onBlur,
  max = 5,
  size = 'md',
  labels
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const starSize = sizes[size]
  const displayValue = hoverValue !== null ? hoverValue : value

  const getLabel = (rating: number) => {
    if (labels && labels[rating - 1]) {
      return labels[rating - 1]
    }
    // Default labels
    const defaultLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    return defaultLabels[rating - 1] || `${rating} stars`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
          const filled = star <= displayValue
          const isHovered = star === displayValue && hoverValue !== null

          return (
            <motion.button
              key={star}
              type="button"
              onClick={() => {
                onChange(star)
                onBlur?.()
              }}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(null)}
              className="relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* Glow effect */}
              {isHovered && (
                <motion.div
                  className="absolute inset-0 -m-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={`${starSize} bg-yellow-400/30 rounded-full blur-xl`} />
                </motion.div>
              )}

              {/* Star */}
              <motion.div
                animate={{
                  scale: filled ? 1 : 0.9,
                  rotate: filled ? [0, -10, 10, 0] : 0
                }}
                transition={{ 
                  duration: 0.3,
                  rotate: { duration: 0.4, ease: "easeInOut" }
                }}
              >
                <Star
                  className={`
                    ${starSize} transition-all duration-200 relative z-10
                    ${filled 
                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-glow' 
                      : 'text-white/30 hover:text-white/50'
                    }
                  `}
                  strokeWidth={1.5}
                />
              </motion.div>

              {/* Sparkle effect on selection */}
              {filled && star === value && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.5, 2],
                    opacity: [1, 0.5, 0]
                  }}
                  transition={{ duration: 0.6 }}
                >
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                      }}
                      animate={{
                        x: [0, (i % 2 ? 1 : -1) * 20 * Math.cos(i * 90 * Math.PI / 180)],
                        y: [0, (i % 2 ? 1 : -1) * 20 * Math.sin(i * 90 * Math.PI / 180)],
                        opacity: [1, 0]
                      }}
                      transition={{ duration: 0.6 }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Label */}
      <AnimatePresence mode="wait">
        {displayValue > 0 && (
          <motion.div
            key={displayValue}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <span className="text-sm font-medium text-white/80">
              {getLabel(displayValue)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
