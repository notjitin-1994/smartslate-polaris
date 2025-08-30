import { motion } from 'framer-motion'
import { User, Building, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

interface Stage {
  name: string
  id: 'requestor' | 'group'
}

interface StarmapProgressIndicatorProps {
  currentStep: 'requestor' | 'group'
  onStepClick?: (step: 'requestor' | 'group') => void
  requestorComplete?: boolean
}

export function StarmapProgressIndicator({ 
  currentStep, 
  onStepClick,
  requestorComplete 
}: StarmapProgressIndicatorProps) {
  const stages: Stage[] = [
    { id: 'requestor', name: 'YOUR INFO' },
    { id: 'group', name: 'TEAM DETAILS' }
  ]
  
  const stageIcons = {
    requestor: User,
    group: Building
  }
  
  const currentStageIndex = currentStep === 'requestor' ? 0 : 1
  
  return (
    <div className="relative">
      {/* Desktop view - no separate container since we're inside the header */}
      <div className="hidden md:block relative">
        <div className="flex items-center justify-center gap-8 relative">
          {/* Progress line background */}
          <div className="absolute left-1/4 right-1/4 top-1/2 -translate-y-1/2 h-1 bg-secondary-700 rounded-full" />
          
          {/* Active progress line */}
          <motion.div 
            className="absolute left-1/4 top-1/2 -translate-y-1/2 h-1 bg-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: currentStageIndex === 0 ? '0%' : '50%' 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Stage indicators */}
          {stages.map((stage, index) => {
            const isActive = stage.id === currentStep
            const isCompleted = stage.id === 'requestor' ? requestorComplete : false
            const isClickable = stage.id === 'requestor' || requestorComplete
            const Icon = stageIcons[stage.id]
            
            return (
              <motion.button
                key={stage.id}
                type="button"
                onClick={() => isClickable && onStepClick?.(stage.id)}
                disabled={!isClickable}
                className={clsx(
                  "relative z-10 flex flex-col items-center gap-2 group transition-all duration-300",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
              >
                {/* Rounded rectangle indicator */}
                <div className="relative">
                  <motion.div
                    className={clsx(
                      "w-32 h-12 rounded-xl flex items-center justify-center gap-1 font-semibold transition-all duration-300 shadow-lg px-2",
                      // Active: brand accent teal fill, no outline
                      isActive && "bg-primary-500 text-[rgb(var(--bg))] scale-110",
                      // Completed: emerald/green with white text
                      isCompleted && "bg-emerald-600 text-white",
                      // Incomplete: very dark indigo with teal text
                      !isActive && !isCompleted && "bg-secondary-700 text-primary-500",
                      // Hover affordance for clickable inactive steps
                      isClickable && !isActive && "group-hover:scale-105 group-hover:brightness-110"
                    )}
                    whileHover={isClickable && !isActive ? { scale: 1.07 } : {}}
                    whileTap={isClickable && !isActive ? { scale: 0.96 } : {}}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3" aria-hidden />
                    ) : (
                      <Icon className={clsx("w-3 h-3", isActive && "text-[rgb(var(--bg))]")} aria-hidden />
                    )}
                    <span className={clsx(
                      "font-heading uppercase text-[11px] leading-none whitespace-nowrap text-center",
                      // Ensure active label text matches dynamic progress active style
                      isActive && "text-[rgb(var(--bg))]"
                    )}>
                      {stage.name}
                    </span>
                  </motion.div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
      
      {/* Mobile view - Compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">
            {stages[currentStageIndex].name}
          </h3>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            {currentStageIndex + 1} of 2
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-secondary-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${((currentStageIndex + (requestorComplete ? 1 : 0.5)) / 2) * 100}%` 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Stage dots */}
        <div className="flex justify-between mt-3 px-1">
          {stages.map((stage, index) => {
            const isActive = stage.id === currentStep
            const isCompleted = stage.id === 'requestor' ? requestorComplete : false
            
            return (
              <motion.button
                key={stage.id}
                type="button"
                onClick={() => (stage.id === 'requestor' || requestorComplete) && onStepClick?.(stage.id)}
                disabled={stage.id === 'group' && !requestorComplete}
                className={clsx(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  isActive && "bg-primary-500 w-5 shadow-lg shadow-primary-500/50",
                  isCompleted && "bg-emerald-600",
                  !isActive && !isCompleted && "bg-secondary-700"
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
