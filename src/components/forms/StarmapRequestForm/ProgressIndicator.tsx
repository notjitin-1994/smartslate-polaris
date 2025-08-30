import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Check, User, Building, Sparkles } from 'lucide-react'

interface ProgressIndicatorProps {
  currentStep: 'requestor' | 'group'
  onStepClick?: (step: 'requestor' | 'group') => void
  requestorComplete?: boolean
}

export function ProgressIndicator({ currentStep, onStepClick, requestorComplete }: ProgressIndicatorProps) {
  const steps = [
    { id: 'requestor', label: "Requestor Info", icon: User },
    { id: 'group', label: 'Group Details', icon: Building },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progress = requestorComplete ? 100 : currentStepIndex === 0 ? 50 : 100

  return (
    <div className="relative mb-8">
      {/* Background with subtle swirl pattern */}
      <div className="absolute inset-0 opacity-5 rounded-2xl overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/logos/logo-swirl.png)',
            backgroundSize: '300px 300px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between relative">
          {/* Progress line background */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full" />
          
          {/* Active progress line */}
          <motion.div 
            className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: requestorComplete ? 'calc(100% - 64px)' : '0%'
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Step indicators */}
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isComplete = step.id === 'requestor' ? requestorComplete : false
            const isClickable = step.id === 'requestor' || requestorComplete
            const Icon = step.icon
            
            return (
              <motion.button
                key={step.id}
                type="button"
                onClick={() => isClickable && onStepClick?.(step.id as 'requestor' | 'group')}
                disabled={!isClickable}
                className={clsx(
                  "relative z-10 flex flex-col items-center gap-2 group transition-all duration-300",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              >
                {/* Circle indicator */}
                <div className="relative">
                  <motion.div
                    className={clsx(
                      "w-14 h-14 rounded-full flex items-center justify-center font-medium transition-all duration-300",
                      "border-2 shadow-lg",
                      isActive && "border-primary-400 bg-primary-500/20 shadow-primary-500/30 scale-110",
                      isComplete && "border-primary-400/60 bg-primary-500/10",
                      !isActive && !isComplete && "border-white/20 bg-white/5",
                      isClickable && !isActive && "group-hover:bg-white/10 group-hover:border-white/30 group-hover:scale-105"
                    )}
                    whileHover={isClickable && !isActive ? { scale: 1.1 } : {}}
                    whileTap={isClickable && !isActive ? { scale: 0.95 } : {}}
                  >
                    {isComplete ? (
                      <Check className="w-6 h-6 text-primary-300" />
                    ) : isActive ? (
                      <Sparkles className="w-6 h-6 text-primary-300 animate-pulse" />
                    ) : (
                      <Icon className="w-6 h-6 text-white/60" />
                    )}
                  </motion.div>
                  
                  {/* Pulse effect for active step */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary-500"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                
                {/* Step name */}
                <motion.span 
                  className={clsx(
                    "text-xs font-medium whitespace-nowrap text-center",
                    isActive && "text-white",
                    isComplete && "text-white/70",
                    !isActive && !isComplete && "text-white/40"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {step.label}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      </div>
      
      {/* Mobile view - Compact */}
      <div className="md:hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">
            {steps[currentStepIndex]?.label || 'Discovery'}
          </h3>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progress}%`
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Step dots */}
        <div className="flex justify-between mt-3 px-1">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex
            const isComplete = step.id === 'requestor' ? requestorComplete : false
            
            return (
              <motion.button
                key={step.id}
                type="button"
                onClick={() => (step.id === 'requestor' || requestorComplete) && onStepClick?.(step.id as 'requestor' | 'group')}
                disabled={step.id === 'group' && !requestorComplete}
                className={clsx(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  isActive && "bg-primary-500 w-5 shadow-lg shadow-primary-500/50",
                  isComplete && "bg-primary-500/50",
                  !isActive && !isComplete && "bg-white/20"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}