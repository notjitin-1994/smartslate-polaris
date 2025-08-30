import { motion } from 'framer-motion'
import { Compass, Users, ShieldAlert, FileText, Truck, BarChart3, Trophy, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

interface Stage {
  name: string
  progress: number
}

interface ProgressIndicatorProps {
  currentStage: number
  totalStages: number
  stages: Stage[]
  onStageClick?: (index: number) => void
}

export function ProgressIndicator({ 
  currentStage, 
  totalStages, 
  stages, 
  onStageClick 
}: ProgressIndicatorProps) {
  // Static labels to render inside each rectangle (universal, uppercase Quicksand)
  const boxLabels = [
    'DISCOVERY',
    'AUDIENCE',
    'CONSTRAINTS',
    'CONTENT',
    'DELIVERY',
    'ASSESSMENT',
    'SUCCESS!'
  ]
  // Icons for each stage (desktop rectangles). Completed stages use a rounded tick.
  const stageIcons = [
    Compass,
    Users,
    ShieldAlert,
    FileText,
    Truck,
    BarChart3,
    Trophy,
  ]
  return (
    <div className="relative">
      {/* Desktop view - no separate container since we're inside the header */}
      <div className="hidden md:block relative">
        <div className="flex items-center justify-between relative">
          {/* Progress line background */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-secondary-700 rounded-full" />
          
          {/* Active progress line */}
          <motion.div 
            className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${((currentStage / (totalStages - 1)) * (100 - 16))}%` 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Stage indicators */}
          {stages.map((stage, index) => {
            const isActive = index === currentStage
            const isCompleted = index < currentStage
            const isClickable = index <= currentStage
            
            return (
              <motion.button
                key={index}
                type="button"
                onClick={() => isClickable && onStageClick?.(index)}
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
                    {(isCompleted ? <CheckCircle2 className="w-3 h-3" aria-hidden /> : (() => {
                      const Icon = stageIcons[index]
                      return Icon ? <Icon className="w-3 h-3" aria-hidden /> : null
                    })())}
                    <span className="font-heading uppercase text-[11px] leading-none whitespace-nowrap text-center">
                      {boxLabels[index] ?? `${index + 1}`}
                    </span>
                  </motion.div>
                </div>
                
                {/* No descriptions below the boxes */}
              </motion.button>
            )
          })}
        </div>
      </div>
      
      {/* Mobile view - Compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">
            {stages[currentStage]?.name || `Stage ${currentStage + 1}`}
          </h3>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            {currentStage + 1} of {totalStages}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-secondary-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-primary-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${((currentStage + (stages[currentStage]?.progress || 0) / 100) / totalStages) * 100}%` 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Stage dots */}
        <div className="flex justify-between mt-3 px-1">
          {stages.map((_, index) => {
            const isActive = index === currentStage
            const isCompleted = index < currentStage
            
            return (
              <motion.button
                key={index}
                type="button"
                onClick={() => (index <= currentStage) && onStageClick?.(index)}
                disabled={index > currentStage}
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