import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'

interface ToggleSwitchProps {
  value: boolean
  onChange: (value: boolean) => void
  onBlur?: () => void
  labels?: {
    on?: string
    off?: string
  }
  size?: 'sm' | 'md' | 'lg'
}

export function ToggleSwitch({ 
  value, 
  onChange, 
  onBlur,
  labels = { on: 'Yes', off: 'No' },
  size = 'md'
}: ToggleSwitchProps) {
  const sizes = {
    sm: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6', icons: 'w-3 h-3' },
    md: { track: 'w-16 h-8', thumb: 'w-7 h-7', translate: 'translate-x-8', icons: 'w-4 h-4' },
    lg: { track: 'w-20 h-10', thumb: 'w-9 h-9', translate: 'translate-x-10', icons: 'w-5 h-5' }
  }

  const config = sizes[size]

  return (
    <div className="flex items-center gap-4">
      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => {
          onChange(!value)
          onBlur?.()
        }}
        className="relative group"
      >
        <motion.div
          className={`
            ${config.track} rounded-full transition-colors duration-300
            ${value 
              ? 'bg-gradient-to-r from-primary-500 to-primary-600' 
              : 'bg-white/20 hover:bg-white/25'
            }
          `}
          animate={{
            boxShadow: value 
              ? '0 0 20px rgba(var(--primary-500), 0.4)' 
              : '0 0 0 rgba(0,0,0,0)'
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Track inner glow */}
          <div className={`
            absolute inset-0 rounded-full transition-opacity duration-300
            ${value ? 'opacity-100' : 'opacity-0'}
            bg-gradient-to-r from-primary-400/20 to-primary-500/20
          `} />
        </motion.div>

        {/* Thumb */}
        <motion.div
          className={`
            absolute top-0.5 left-0.5 ${config.thumb} 
            bg-white rounded-full shadow-lg
            flex items-center justify-center
          `}
          animate={{
            x: value ? config.translate.split('-')[1] : '0px',
            rotate: value ? 360 : 0
          }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30 
          }}
        >
          {/* Icon inside thumb */}
          <motion.div
            animate={{
              scale: value ? 1 : 0,
              opacity: value ? 1 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            <Check className={`${config.icons} text-primary-500`} strokeWidth={3} />
          </motion.div>
          <motion.div
            className="absolute"
            animate={{
              scale: value ? 0 : 1,
              opacity: value ? 0 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <X className={`${config.icons} text-gray-400`} strokeWidth={2} />
          </motion.div>
        </motion.div>
      </button>

      {/* Labels */}
      <div className="flex items-center gap-3">
        <motion.span
          className={`
            text-sm font-medium transition-colors duration-300
            ${!value ? 'text-white' : 'text-white/40'}
          `}
          animate={{
            scale: !value ? 1.05 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          {labels.off}
        </motion.span>
        
        <div className="w-px h-4 bg-white/20" />
        
        <motion.span
          className={`
            text-sm font-medium transition-colors duration-300
            ${value ? 'text-white' : 'text-white/40'}
          `}
          animate={{
            scale: value ? 1.05 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          {labels.on}
        </motion.span>
      </div>
    </div>
  )
}
