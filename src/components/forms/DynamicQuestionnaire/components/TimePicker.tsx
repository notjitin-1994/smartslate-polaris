import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface TimePickerProps {
  value: string // HH:MM format
  onChange: (time: string) => void
  onBlur?: () => void
  min?: string
  max?: string
  step?: number // minutes
}

export function TimePicker({ 
  value = '00:00', 
  onChange, 
  onBlur,
  min,
  max,
  step = 15
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, minutes] = value.split(':').map(Number)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateTime = (newHours: number, newMinutes: number) => {
    const h = Math.max(0, Math.min(23, newHours))
    const m = Math.max(0, Math.min(59, newMinutes))
    const newTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    
    // Check min/max constraints
    if (min && newTime < min) return
    if (max && newTime > max) return
    
    onChange(newTime)
  }

  const adjustMinutes = (direction: 1 | -1) => {
    let newMinutes = minutes + (step * direction)
    let newHours = hours
    
    if (newMinutes >= 60) {
      newHours = (hours + 1) % 24
      newMinutes = newMinutes % 60
    } else if (newMinutes < 0) {
      newHours = hours === 0 ? 23 : hours - 1
      newMinutes = 60 + newMinutes
    }
    
    updateTime(newHours, newMinutes)
  }

  const getQuickTimes = () => {
    const times = []
    for (let h = 0; h < 24; h += 3) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        if ((!min || time >= min) && (!max || time <= max)) {
          times.push(time)
        }
      }
    }
    return times
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Main Input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-4 py-3 rounded-xl cursor-pointer
          bg-white/10 border-2 transition-all duration-200
          ${isOpen 
            ? 'border-primary-500/50 shadow-lg shadow-primary-500/10' 
            : 'border-white/20 hover:border-white/30 hover:bg-white/15'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary-400' : 'text-white/40'}`} />
          
          <div className="flex items-center gap-1 text-lg font-mono">
            <span className="text-white">{hours.toString().padStart(2, '0')}</span>
            <motion.span 
              className="text-white/60"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              :
            </motion.span>
            <span className="text-white">{minutes.toString().padStart(2, '0')}</span>
          </div>

          {/* Quick adjust buttons */}
          <div className="ml-auto flex flex-col gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                adjustMinutes(1)
              }}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                adjustMinutes(-1)
              }}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Time wheels */}
            <div className="p-4">
              <div className="flex gap-4 justify-center">
                {/* Hours wheel */}
                <div className="text-center">
                  <div className="text-xs text-white/50 mb-2">Hours</div>
                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => updateTime(parseInt(e.target.value) || 0, minutes)}
                      onBlur={() => onBlur?.()}
                      min={0}
                      max={23}
                      className="w-16 px-2 py-1 text-center text-2xl font-mono bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center text-2xl text-white/40">:</div>

                {/* Minutes wheel */}
                <div className="text-center">
                  <div className="text-xs text-white/50 mb-2">Minutes</div>
                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => updateTime(hours, parseInt(e.target.value) || 0)}
                      onBlur={() => onBlur?.()}
                      min={0}
                      max={59}
                      step={step}
                      className="w-16 px-2 py-1 text-center text-2xl font-mono bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick select times */}
            <div className="border-t border-white/10 p-3">
              <div className="text-xs text-white/50 mb-2">Quick select</div>
              <div className="grid grid-cols-4 gap-2">
                {getQuickTimes().slice(0, 8).map((time) => (
                  <motion.button
                    key={time}
                    type="button"
                    onClick={() => {
                      onChange(time)
                      setIsOpen(false)
                      onBlur?.()
                    }}
                    className={`
                      px-2 py-1.5 rounded-lg text-sm font-mono transition-all
                      ${value === time 
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40' 
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {time}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
