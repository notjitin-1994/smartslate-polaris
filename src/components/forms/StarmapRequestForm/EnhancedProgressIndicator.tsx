import { motion, AnimatePresence } from 'framer-motion'
import { Check, User, Building, Sparkles } from 'lucide-react'

interface ProgressIndicatorProps {
  currentStep: 'requestor' | 'group'
  onStepClick?: (step: 'requestor' | 'group') => void
  requestorComplete?: boolean
  showFullJourney?: boolean
}

interface JourneyStep {
  id: string
  label: string
  icon: React.ReactNode
  type: 'static' | 'dynamic'
}

export function EnhancedProgressIndicator({ 
  currentStep, 
  onStepClick, 
  requestorComplete,
  showFullJourney = false 
}: ProgressIndicatorProps) {
  
  // Full journey steps (static + dynamic)
  const fullJourney: JourneyStep[] = [
    { id: 'requestor', label: 'Your Information', icon: <User className="w-4 h-4" />, type: 'static' },
    { id: 'group', label: 'Team Details', icon: <Building className="w-4 h-4" />, type: 'static' },
    { id: 'discovery-1', label: 'Discovery', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-2', label: 'Analysis', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-3', label: 'Strategy', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-4', label: 'Planning', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-5', label: 'Execution', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-6', label: 'Metrics', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
    { id: 'discovery-7', label: 'Review', icon: <Sparkles className="w-3 h-3" />, type: 'dynamic' },
  ]
  
  // Current view: just the static steps
  const staticSteps = fullJourney.filter(step => step.type === 'static')
  const currentStepIndex = staticSteps.findIndex(step => step.id === currentStep)
  
  const isStepComplete = (stepId: string) => {
    return stepId === 'requestor' ? requestorComplete : false
  }
  
  const isStepActive = (stepId: string) => {
    return stepId === currentStep
  }
  
  const isStepClickable = (stepId: string) => {
    return stepId === 'requestor' || requestorComplete
  }

  return (
    <div className="mb-8">
      {/* Header showing journey context */}
      <div className="text-center mb-6">
        <h3 className="text-sm font-medium text-white/60">
          {showFullJourney ? 'Your Complete Discovery Journey' : 'Getting Started'}
        </h3>
        <p className="text-xs text-white/40 mt-1">
          {showFullJourney 
            ? '2 initial steps + 7 personalized discovery stages' 
            : 'Step ' + (currentStepIndex + 1) + ' of 2'}
        </p>
      </div>

      {/* Progress visualization */}
      <div className="relative">
        {/* Desktop view */}
        <div className="hidden md:block">
          <div className="flex items-center justify-center">
            {(showFullJourney ? fullJourney : staticSteps).map((step, index) => {
              const isActive = isStepActive(step.id)
              const isComplete = isStepComplete(step.id)
              const isClickable = step.type === 'static' && isStepClickable(step.id)
              const isDynamic = step.type === 'dynamic'
              
              return (
                <motion.div
                  key={step.id}
                  className="flex items-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Step indicator */}
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id as 'requestor' | 'group')}
                    disabled={!isClickable}
                    className={`
                      relative group flex flex-col items-center gap-2
                      ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    {/* Circle */}
                    <motion.div
                      className={`
                        relative flex items-center justify-center rounded-full transition-all duration-300
                        ${isDynamic ? 'w-8 h-8' : 'w-12 h-12'}
                        ${isActive 
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                          : isComplete 
                          ? 'bg-primary-500/20 text-primary-300 border-2 border-primary-500' 
                          : isDynamic
                          ? 'bg-white/5 text-white/30 border border-white/10'
                          : 'bg-white/5 text-white/40 border-2 border-white/10'
                        }
                        ${isClickable && !isActive ? 'group-hover:bg-white/10 group-hover:border-white/20' : ''}
                      `}
                      whileHover={isClickable && !isActive ? { scale: 1.1 } : {}}
                      whileTap={isClickable && !isActive ? { scale: 0.95 } : {}}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                      
                      {/* Pulse effect for active */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-primary-500"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    
                    {/* Label */}
                    <motion.span
                      className={`
                        text-xs font-medium whitespace-nowrap
                        ${isDynamic ? 'max-w-[60px]' : 'max-w-[80px]'}
                        ${isActive 
                          ? 'text-white' 
                          : isComplete 
                          ? 'text-white/70' 
                          : 'text-white/40'
                        }
                      `}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      {step.label}
                    </motion.span>
                  </button>

                  {/* Connector line */}
                  {index < (showFullJourney ? fullJourney : staticSteps).length - 1 && (
                    <div 
                      className={`
                        h-0.5 transition-all duration-500
                        ${isDynamic || (showFullJourney && index === 1) 
                          ? 'w-8 mx-1' 
                          : 'w-16 mx-4'
                        }
                        ${isComplete 
                          ? 'bg-primary-500/50' 
                          : 'bg-white/10'
                        }
                      `}
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Mobile view - Compact */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4">
            {staticSteps.map((step, index) => {
              const isActive = isStepActive(step.id)
              const isComplete = isStepComplete(step.id)
              const isClickable = isStepClickable(step.id)
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id as 'requestor' | 'group')}
                    disabled={!isClickable}
                    className={`
                      flex flex-col items-center gap-2 flex-1
                      ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${isActive 
                          ? 'bg-primary-500 text-white' 
                          : isComplete 
                          ? 'bg-primary-500/20 text-primary-300' 
                          : 'bg-white/5 text-white/40'
                        }
                      `}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    <span className={`
                      text-xs font-medium
                      ${isActive ? 'text-white' : 'text-white/60'}
                    `}>
                      {step.label}
                    </span>
                  </button>
                  
                  {index < staticSteps.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-2
                      ${isComplete ? 'bg-primary-500/50' : 'bg-white/10'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Mobile hint about future stages */}
          <div className="mt-4 text-center">
            <p className="text-xs text-white/40">
              + 7 personalized discovery stages
            </p>
          </div>
        </div>
      </div>

      {/* Optional preview of dynamic stages */}
      {!showFullJourney && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-white/40 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            7 AI-powered stages will be unlocked after completion
          </p>
        </motion.div>
      )}
    </div>
  )
}
