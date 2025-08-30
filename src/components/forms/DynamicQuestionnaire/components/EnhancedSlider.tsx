import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EnhancedSliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
  labels?: { value: number; label: string }[]
  showSteps?: boolean
}

export function EnhancedSlider({ 
  min, 
  max, 
  step = 1,
  value, 
  onChange, 
  onBlur,
  labels,
  showSteps = false
}: EnhancedSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const percentage = ((value - min) / (max - min)) * 100
  const steps = showSteps ? Math.floor((max - min) / step) + 1 : 0

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setShowTooltip(true)
    handleMouseMove(e)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sliderRef.current) return
    
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = x / rect.width
    const newValue = Math.round((percentage * (max - min) + min) / step) * step
    const clampedValue = Math.max(min, Math.min(max, newValue))
    
    if (clampedValue !== value) {
      onChange(clampedValue)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setTimeout(() => setShowTooltip(false), 500)
    onBlur?.()
  }

  return (
    <div className="space-y-6">
      {/* Slider Track */}
      <div 
        ref={sliderRef}
        className="relative h-12 flex items-center cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => {
          setTimeout(() => setShowTooltip(false), 500)
          onBlur?.()
        }}
      >
        {/* Background Track */}
        <div className="absolute inset-x-0 h-3 bg-white/10 rounded-full overflow-hidden">
          {/* Progress Fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: isDragging ? 0 : 0.3, ease: "easeOut" }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </motion.div>
        </div>

        {/* Step Markers */}
        {showSteps && steps > 1 && (
          <div className="absolute inset-x-0 flex justify-between px-2">
            {Array.from({ length: steps }).map((_, i) => {
              const stepValue = min + i * step
              const stepPercentage = ((stepValue - min) / (max - min)) * 100
              const isActive = stepValue <= value
              
              return (
                <div
                  key={i}
                  className="absolute w-1 h-3 -translate-x-1/2"
                  style={{ left: `${stepPercentage}%` }}
                >
                  <div className={`
                    w-full h-full rounded-full transition-all duration-300
                    ${isActive ? 'bg-white/40' : 'bg-white/20'}
                  `} />
                </div>
              )
            })}
          </div>
        )}

        {/* Thumb */}
        <motion.div
          className="absolute w-6 h-6 -translate-x-1/2"
          style={{ left: `${percentage}%` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className={`
            w-full h-full rounded-full bg-white shadow-lg shadow-black/20
            ring-4 transition-all duration-200
            ${isDragging 
              ? 'ring-primary-500/40 shadow-xl shadow-primary-500/30' 
              : 'ring-primary-500/20 hover:ring-primary-500/30'
            }
          `}>
            {/* Inner dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-500 rounded-full" />
            </div>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2"
              >
                <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl">
                  {value}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => {
            setShowTooltip(false)
            onBlur?.()
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {/* Labels */}
      {labels && labels.length > 0 ? (
        <div className="relative flex justify-between text-xs">
          {labels.map((label) => {
            const labelPercentage = ((label.value - min) / (max - min)) * 100
            return (
              <div
                key={label.value}
                className="absolute -translate-x-1/2"
                style={{ left: `${labelPercentage}%` }}
              >
                <span className={`
                  transition-colors duration-300
                  ${value >= label.value ? 'text-white/80' : 'text-white/40'}
                `}>
                  {label.label}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex justify-between text-xs text-white/40">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
