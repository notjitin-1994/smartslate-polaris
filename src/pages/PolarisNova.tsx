import { PolarisWizard } from '@/features/polaris/components/PolarisWizard'
import WelcomeStep from '@/features/polaris/components/steps/WelcomeStep'
import OrgStep from '@/features/polaris/components/steps/OrgStep'
import { usePolarisState } from '@/features/polaris/hooks/usePolarisState'

export default function PolarisNova() {
  const state = usePolarisState()
  const {
    activeStep,
    setActiveStep,
    experienceAnswer,
    setExperienceAnswer,
    staticAnswers,
    setStaticAnswers,
  } = state

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <PolarisWizard />

      <div className="mt-6">
        {activeStep === 'experience' && (
          <WelcomeStep
            value={experienceAnswer}
            onChange={setExperienceAnswer}
            onNext={() => setActiveStep('static')}
          />
        )}
        {activeStep === 'static' && (
          <OrgStep
            value={staticAnswers}
            onChange={setStaticAnswers}
            onBack={() => setActiveStep('experience')}
            onNext={() => setActiveStep('stage2')}
          />
        )}
        {/* Additional steps will be added incrementally */}
      </div>
    </div>
  )
}


