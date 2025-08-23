import { useState, useCallback, useMemo } from 'react'
import type { NAResponseMap, NAField } from '@/polaris/needs-analysis/types'
import type { NAReport } from '@/polaris/needs-analysis/report'

export type PolarisStep = 'experience' | 'static' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'report'

export interface PolarisState {
  activeStep: PolarisStep
  loading: boolean
  error: string | null
  summaryCount: number
  showUpgradeModal: boolean
  experienceAnswer: NAResponseMap
  staticAnswers: NAResponseMap
  stage2Fields: NAField[]
  stage2Answers: NAResponseMap
  stage3Fields: NAField[]
  stage3Answers: NAResponseMap
  stage4Fields: NAField[]
  stage4Answers: NAResponseMap
  stage5Fields: NAField[]
  stage5Answers: NAResponseMap
  report: NAReport | null
  currentStepNumber: number
  summaryId: string | null
}

export interface PolarisActions {
  setActiveStep: (step: PolarisStep) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSummaryCount: (count: number) => void
  setShowUpgradeModal: (show: boolean) => void
  setExperienceAnswer: (answer: NAResponseMap) => void
  setStaticAnswers: (answers: NAResponseMap) => void
  setStage2Fields: (fields: NAField[]) => void
  setStage2Answers: (answers: NAResponseMap) => void
  setStage3Fields: (fields: NAField[]) => void
  setStage3Answers: (answers: NAResponseMap) => void
  setStage4Fields: (fields: NAField[]) => void
  setStage4Answers: (answers: NAResponseMap) => void
  setStage5Fields: (fields: NAField[]) => void
  setStage5Answers: (answers: NAResponseMap) => void
  setReport: (report: NAReport | null) => void
  setSummaryId: (id: string | null) => void
  resetState: () => void
  isStepComplete: (step: PolarisStep) => boolean
  canProgressToStep: (step: PolarisStep) => boolean
}

const INITIAL_STATE: PolarisState = {
  activeStep: 'experience',
  loading: false,
  error: null,
  summaryCount: 0,
  showUpgradeModal: false,
  experienceAnswer: {},
  staticAnswers: {},
  stage2Fields: [],
  stage2Answers: {},
  stage3Fields: [],
  stage3Answers: {},
  stage4Fields: [],
  stage4Answers: {},
  stage5Fields: [],
  stage5Answers: {},
  report: null,
  currentStepNumber: 1,
  summaryId: null,
}

const STEP_ORDER: PolarisStep[] = ['experience', 'static', 'stage2', 'stage3', 'stage4', 'stage5', 'report']

/**
 * Custom hook for managing Polaris state
 */
export function usePolarisState(): PolarisState & PolarisActions {
  const [state, setState] = useState<PolarisState>(INITIAL_STATE)
  
  // Calculate current step number
  const currentStepNumber = useMemo(() => {
    return STEP_ORDER.indexOf(state.activeStep) + 1
  }, [state.activeStep])
  
  // Actions
  const setActiveStep = useCallback((step: PolarisStep) => {
    setState(prev => ({ ...prev, activeStep: step, currentStepNumber: STEP_ORDER.indexOf(step) + 1 }))
  }, [])
  
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])
  
  const setSummaryCount = useCallback((summaryCount: number) => {
    setState(prev => ({ ...prev, summaryCount }))
  }, [])
  
  const setShowUpgradeModal = useCallback((showUpgradeModal: boolean) => {
    setState(prev => ({ ...prev, showUpgradeModal }))
  }, [])
  
  const setExperienceAnswer = useCallback((experienceAnswer: NAResponseMap) => {
    setState(prev => ({ ...prev, experienceAnswer }))
  }, [])
  
  const setStaticAnswers = useCallback((staticAnswers: NAResponseMap) => {
    setState(prev => ({ ...prev, staticAnswers }))
  }, [])
  
  const setStage2Fields = useCallback((stage2Fields: NAField[]) => {
    setState(prev => ({ ...prev, stage2Fields }))
  }, [])
  
  const setStage2Answers = useCallback((stage2Answers: NAResponseMap) => {
    setState(prev => ({ ...prev, stage2Answers }))
  }, [])
  
  const setStage3Fields = useCallback((stage3Fields: NAField[]) => {
    setState(prev => ({ ...prev, stage3Fields }))
  }, [])
  
  const setStage3Answers = useCallback((stage3Answers: NAResponseMap) => {
    setState(prev => ({ ...prev, stage3Answers }))
  }, [])
  
  const setStage4Fields = useCallback((stage4Fields: NAField[]) => {
    setState(prev => ({ ...prev, stage4Fields }))
  }, [])
  
  const setStage4Answers = useCallback((stage4Answers: NAResponseMap) => {
    setState(prev => ({ ...prev, stage4Answers }))
  }, [])
  
  const setStage5Fields = useCallback((stage5Fields: NAField[]) => {
    setState(prev => ({ ...prev, stage5Fields }))
  }, [])
  
  const setStage5Answers = useCallback((stage5Answers: NAResponseMap) => {
    setState(prev => ({ ...prev, stage5Answers }))
  }, [])
  
  const setReport = useCallback((report: NAReport | null) => {
    setState(prev => ({ ...prev, report }))
  }, [])
  
  const setSummaryId = useCallback((summaryId: string | null) => {
    setState(prev => ({ ...prev, summaryId }))
  }, [])
  
  const resetState = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])
  
  // Check if a step is complete
  const isStepComplete = useCallback((step: PolarisStep): boolean => {
    switch (step) {
      case 'experience':
        return Object.keys(state.experienceAnswer).length > 0
      case 'static':
        return Object.keys(state.staticAnswers).length > 0
      case 'stage2':
        return state.stage2Fields.length > 0 && Object.keys(state.stage2Answers).length > 0
      case 'stage3':
        return state.stage3Fields.length > 0 && Object.keys(state.stage3Answers).length > 0
      case 'stage4':
        return state.stage4Fields.length > 0 && Object.keys(state.stage4Answers).length > 0
      case 'stage5':
        return state.stage5Fields.length > 0 && Object.keys(state.stage5Answers).length > 0
      case 'report':
        return state.report !== null
      default:
        return false
    }
  }, [state])
  
  // Check if user can progress to a step
  const canProgressToStep = useCallback((step: PolarisStep): boolean => {
    const stepIndex = STEP_ORDER.indexOf(step)
    if (stepIndex === 0) return true // Can always go to first step
    
    // Check if all previous steps are complete
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(STEP_ORDER[i])) {
        return false
      }
    }
    
    return true
  }, [isStepComplete])
  
  return {
    ...state,
    currentStepNumber,
    setActiveStep,
    setLoading,
    setError,
    setSummaryCount,
    setShowUpgradeModal,
    setExperienceAnswer,
    setStaticAnswers,
    setStage2Fields,
    setStage2Answers,
    setStage3Fields,
    setStage3Answers,
    setStage4Fields,
    setStage4Answers,
    setStage5Fields,
    setStage5Answers,
    setReport,
    setSummaryId,
    resetState,
    isStepComplete,
    canProgressToStep,
  }
}
