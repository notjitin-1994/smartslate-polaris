import { Check } from 'lucide-react'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  stepTitles: string[]
}

export function WizardProgress({ currentStep, totalSteps, stepTitles }: WizardProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-colors duration-200
                    ${isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <span className={`
                  mt-2 text-xs font-medium
                  ${isCurrent ? 'text-blue-600' : 'text-gray-600'}
                `}>
                  {stepTitles[i]}
                </span>
              </div>
              
              {i < totalSteps - 1 && (
                <div
                  className={`
                    h-0.5 w-16 mx-2 transition-colors duration-200
                    ${stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
