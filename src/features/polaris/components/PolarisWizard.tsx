import { useCallback, useEffect, useMemo, useState } from 'react'
import { PolarisNavigation } from './PolarisNavigation'
import { usePolarisState, type PolarisStep } from '../hooks/usePolarisState'
import { saveSummary, updateSummaryFinalContent } from '@/services/polarisSummaryService'

interface PolarisWizardProps {
  onCreatedSummaryId?: (id: string) => void
}

export function PolarisWizard({ onCreatedSummaryId }: PolarisWizardProps) {
  const state = usePolarisState()
  const {
    activeStep,
    setActiveStep,
    isStepComplete,
    canProgressToStep,
    experienceAnswer,
    staticAnswers,
    stage3Answers,
  } = state

  const [summaryId, setSummaryId] = useState<string | null>(null)
  const [autosavePending, setAutosavePending] = useState(false)

  const currentStepNumber = useMemo(() => {
    return ['experience','static','stage2','stage3','stage4','stage5','report'].indexOf(activeStep) + 1
  }, [activeStep])

  // Create a draft as soon as org name or core details exist
  useEffect(() => {
    const shouldCreate = !summaryId && (staticAnswers['org_name'] || staticAnswers['industry'])
    if (!shouldCreate) return
    let mounted = true
    ;(async () => {
      const { data, error } = await saveSummary({
        company_name: (staticAnswers['org_name'] as string) || null,
        report_title: null,
        summary_content: '# Draft – Starmap in progress',
        prelim_report: null,
        dynamic_questionnaire_report: null,
        stage1_answers: experienceAnswer as Record<string, any>,
        stage2_answers: staticAnswers as Record<string, any>,
        stage3_answers: stage3Answers as Record<string, any>,
        stage2_questions: [],
        stage3_questions: [],
        greeting_report: null,
        org_report: null,
        requirement_report: null,
      })
      if (!error && data && mounted) {
        setSummaryId(data.id)
        onCreatedSummaryId?.(data.id)
      }
    })()
    return () => { mounted = false }
  }, [summaryId, staticAnswers, experienceAnswer, stage3Answers, onCreatedSummaryId])

  // Basic autosave on step change
  const handleStepChange = useCallback(async (step: PolarisStep) => {
    if (!canProgressToStep(step)) return
    if (summaryId) {
      setAutosavePending(true)
      try {
        await updateSummaryFinalContent(summaryId, '# Draft – Starmap in progress', {
          stage3_answers_merge: stage3Answers as Record<string, any>,
        })
      } finally {
        setAutosavePending(false)
      }
    }
    setActiveStep(step)
  }, [canProgressToStep, setActiveStep, summaryId, stage3Answers])

  return (
    <div className="space-y-4">
      <PolarisNavigation
        activeStep={activeStep}
        onStepChange={handleStepChange}
        isStepComplete={isStepComplete}
        canProgressToStep={canProgressToStep}
        currentStepNumber={currentStepNumber}
      />
      {autosavePending && (
        <div className="text-xs text-white/60">Saving…</div>
      )}
      <div>
        {/* The page mounts concrete step components. The page decides which ones to show. */}
      </div>
    </div>
  )
}

export default PolarisWizard


