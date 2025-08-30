import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { DynamicQuestionInput } from './DynamicQuestionInput'
import { ProgressIndicator } from './ProgressIndicator'
import { QuestionnaireHeader } from '../shared/QuestionnaireHeader'
import { FinalReportLoadingScreen } from '@/components/FinalReportLoadingScreen'
import { HEADER_TITLE, getDynamicSubheading } from '../shared/headerCopy'
import type { DynamicQuestion, DynamicQuestionnaireProps, StageAnswers } from './types'

const AUTOSAVE_DELAY = 1000

// Helper to build a stable, analytics-friendly stage key when backend doesn't provide one
const slugify = (input: string): string => {
  const s = (input || '').toLowerCase().trim()
  return s
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function DynamicQuestionnaire({ 
  recordId, 
  starmapId, 
  dynamicQuestions, 
  onComplete 
}: DynamicQuestionnaireProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [answers, setAnswers] = useState<StageAnswers>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [answersLoaded, setAnswersLoaded] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [exitKey, setExitKey] = useState(0)
  const [showFinalReportLoader, setShowFinalReportLoader] = useState(false)

  const scrollToTopSmooth = (): Promise<void> => {
    return new Promise(resolve => {
      try {
        if (typeof window !== 'undefined') {
          if ('scrollTo' in window) {
            window.scrollTo({ top: 0, behavior: 'auto' })
          } else {
            window.scrollTo(0, 0)
          }
          const doc = document as any
          if (doc?.documentElement) doc.documentElement.scrollTop = 0
          if (doc?.body) doc.body.scrollTop = 0
        }
      } catch {
        try { window.scrollTo(0, 0) } catch {}
      }
      setTimeout(resolve, 60)
    })
  }
  
  // Normalize raw dynamic questions to UI-friendly shape
  const normalizedStages = useMemo(() => {
    const rawStages = (dynamicQuestions?.stages || []) as any[]
    const mapType = (t: string): DynamicQuestion['type'] => {
      // Keep the API types as-is to use our enhanced components
      const type = (t || '').toLowerCase()
      const supportedTypes = [
        'text', 'textarea', 'number', 'single_select', 'multi_select', 
        'boolean', 'slider', 'date', 'email', 'url', 
        'tags', 'toggle', 'rating', 'time', 'color'
      ]
      if (supportedTypes.includes(type)) {
        return type as DynamicQuestion['type']
      }
      // Map any unknown types to text as fallback
      return 'text'
    }

    return rawStages.map((stage, sIdx) => {
      const name = stage?.name || stage?.title || `Stage ${sIdx + 1}`
      const key = stage?.id || stage?.key || slugify(name)
      const description = stage?.description || ''
      const questions = (stage?.questions || []).map((q: any, qIdx: number) => {
        const qType = mapType(q?.type)
        let options = q?.options
        // Boolean questions don't need options anymore - handled by the component
        if (!options && qType === 'boolean') {
          options = undefined
        }
        const min = q?.min ?? q?.validation?.min
        const max = q?.max ?? q?.validation?.max
        const maxLength = q?.maxLength ?? q?.validation?.maxLength
        const minLength = q?.minLength ?? q?.validation?.minLength
        return {
          id: q?.id || `${sIdx}_${qIdx}`,
          type: qType,
          label: q?.label || q?.text || `Question ${qIdx + 1}`,
          placeholder: q?.placeholder,
          helperText: q?.helperText || q?.help || '',
          required: !!q?.required,
          options: Array.isArray(options) ? options.map((o: any) => ({ value: o?.value ?? o?.id ?? String(o), label: o?.label ?? String(o?.value ?? o) })) : undefined,
          defaultValue: q?.default ?? q?.defaultValue,
          validation: {
            min: typeof min === 'number' ? min : undefined,
            max: typeof max === 'number' ? max : undefined,
            minLength: typeof minLength === 'number' ? minLength : undefined,
            maxLength: typeof maxLength === 'number' ? maxLength : undefined,
            message: q?.validation?.message || q?.message,
          },
          metadata: q?.metadata || undefined,
        } as DynamicQuestion
      })
      return { name, key, description, questions }
    })
  }, [dynamicQuestions])

  const stages = normalizedStages
  const totalStages = stages.length
  const currentQuestions = stages[currentStage]?.questions || []
  const stageName = stages[currentStage]?.name || `Stage ${currentStage + 1}`
  const stageDescription = stages[currentStage]?.description || ''

  // Helpers to persist and restore the last visited stage per record
  const getLocalStageKey = (id?: string) => `dq_stage_${id || ''}`
  const clampStage = (index: number) => {
    if (Number.isNaN(index) || index < 0) return 0
    if (index > totalStages - 1) return Math.max(totalStages - 1, 0)
    return index
  }
  const persistCurrentStage = (index: number) => {
    try {
      if (typeof window !== 'undefined' && recordId) {
        window.localStorage.setItem(getLocalStageKey(recordId), String(clampStage(index)))
      }
    } catch {}
  }

  // Load saved answers on mount
  useEffect(() => {
    loadSavedAnswers()
  }, [recordId])

  // Autosave answers
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    
    const timer = setTimeout(() => {
      saveAnswers()
    }, AUTOSAVE_DELAY)
    
    setAutoSaveTimer(timer)
    
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
    }
  }, [answers])

  // On first load, try to resume from last visited stage (localStorage -> derived from answers)
  useEffect(() => {
    if (isInitialized || !recordId || totalStages === 0) return

    // Read stored stage (may be null if not present)
    let storedStage: number | null = null
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(getLocalStageKey(recordId))
        if (stored != null) storedStage = clampStage(parseInt(stored, 10))
      }
    } catch {}

    // Derive from answers only after answers have loaded
    let answeredStage: number | null = null
    if (answersLoaded) {
      let highestWithAnswer = -1
      for (let s = 0; s < totalStages; s++) {
        const stageQuestions = stages[s]?.questions || []
        if (stageQuestions.length === 0) continue
        const hasAny = stageQuestions.some((q: DynamicQuestion) => {
          const key = `stage_${s}_${q.id}`
          return answers[key] !== undefined && answers[key] !== null && `${answers[key]}` !== ''
        })
        if (hasAny) highestWithAnswer = s
      }
      answeredStage = highestWithAnswer >= 0 ? clampStage(highestWithAnswer) : null
    }

    // If neither stored nor answers are ready, wait
    if (!answersLoaded && storedStage == null) return

    // Prefer the furthest progress between stored and derived
    const resumeStage = clampStage(Math.max(storedStage ?? -1, answeredStage ?? -1, 0))
    setCurrentStage(resumeStage)
    setIsInitialized(true)
  }, [answersLoaded, answers, recordId, totalStages])

  // Persist whenever stage changes (defensive in case of programmatic changes)
  useEffect(() => {
    if (!recordId || !isInitialized) return
    persistCurrentStage(currentStage)
  }, [currentStage, recordId, isInitialized])

  // After answers load, if we discover a later stage than the current one, jump forward
  useEffect(() => {
    if (!isInitialized || !answersLoaded || totalStages === 0) return
    let highestWithAnswer = -1
    for (let s = 0; s < totalStages; s++) {
      const stageQuestions = stages[s]?.questions || []
      if (stageQuestions.length === 0) continue
      const hasAny = stageQuestions.some((q: DynamicQuestion) => {
        const key = `stage_${s}_${q.id}`
        return answers[key] !== undefined && answers[key] !== null && `${answers[key]}` !== ''
      })
      if (hasAny) highestWithAnswer = s
    }
    if (highestWithAnswer > currentStage) {
      const derived = clampStage(highestWithAnswer)
      setCurrentStage(derived)
      persistCurrentStage(derived)
    }
  }, [isInitialized, answersLoaded, answers, totalStages, currentStage])

  const loadSavedAnswers = async () => {
    if (!recordId) return
    
    try {
      const { data, error } = await supabase
        .from('master_discovery')
        .select('dynamic_answers')
        .eq('id', recordId)
        .single()
      
      if (data?.dynamic_answers) {
        const saved = data.dynamic_answers as any
        const looksFlat = Object.keys(saved || {}).some(k => k.startsWith('stage_'))
        if (looksFlat) {
          setAnswers(saved)
        } else if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
          // Nested shape: { [stageKey]: { [questionId]: { question_id, question_text, user_answer } | value } }
          const stageKeyToIndex: Record<string, number> = {}
          stages.forEach((s: any, idx: number) => { if (s?.key) stageKeyToIndex[s.key] = idx })
          const flattened: StageAnswers = {}
          for (const [stageKey, stageBlock] of Object.entries<any>(saved)) {
            const sIdx = stageKeyToIndex[stageKey]
            if (sIdx == null) continue
            const questionsMap = stageBlock || {}
            for (const [qid, payload] of Object.entries<any>(questionsMap)) {
              const value = payload && typeof payload === 'object' && 'user_answer' in payload
                ? (payload as any).user_answer
                : payload
              flattened[`stage_${sIdx}_${qid}`] = value
            }
          }
          setAnswers(flattened)
        }
      }
    } catch (error) {
      console.error('Error loading saved answers:', error)
    } finally {
      setAnswersLoaded(true)
    }
  }

  const saveAnswers = async () => {
    if (!recordId) return
    
    // Build a per-stage payload with tagged entries: { [questionId]: { question_id, question_text, user_answer } }
    const currentStageConfig: any = stages[currentStage] || {}
    const stageKey: string = currentStageConfig?.key || `stage_${currentStage}`
    const stageQuestions: DynamicQuestion[] = (currentStageConfig?.questions || []) as DynamicQuestion[]
    const stagePayload: Record<string, any> = {}
    for (const q of stageQuestions) {
      const aKey = `stage_${currentStage}_${q.id}`
      const userAnswer = (answers as any)[aKey]
      if (userAnswer !== undefined) {
        stagePayload[q.id] = {
          question_id: q.id,
          question_text: q.label || (q as any)?.text || '',
          user_answer: userAnswer
        }
      }
    }
    if (Object.keys(stagePayload).length === 0) return
    
    try {
      // Preferred path: server-side JSONB nested merge per stage (idempotent and race-safe)
      const { error: rpcError } = await supabase.rpc('save_dynamic_stage_answers', {
        p_id: recordId,
        p_stage: stageKey,
        p_answers: stagePayload
      })
      if (rpcError) throw rpcError
      setShowSaveIndicator(true)
      setTimeout(() => setShowSaveIndicator(false), 2000)
      return
    } catch (rpcErr) {
      // Fallback: merge on client to avoid overwriting other stages
      try {
        const { data, error: readErr } = await supabase
          .from('master_discovery')
          .select('dynamic_answers')
          .eq('id', recordId)
          .single()
        if (readErr) throw readErr
        const serverAnswers = (data && (data as any).dynamic_answers) || {}
        const prevStageBlock = (serverAnswers && (serverAnswers as any)[stageKey]) || {}
        const mergedStage = { ...prevStageBlock, ...stagePayload }
        const merged = { ...serverAnswers, [stageKey]: mergedStage }
        const { error: updateErr } = await supabase
          .from('master_discovery')
          .update({ 
            dynamic_answers: merged
          })
          .eq('id', recordId)
        if (updateErr) throw updateErr
        setShowSaveIndicator(true)
        setTimeout(() => setShowSaveIndicator(false), 2000)
      } catch (fallbackErr) {
        console.error('Error saving answers (fallback):', fallbackErr)
      }
    }
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [`stage_${currentStage}_${questionId}`]: value
    }))
  }

  const validateCurrentStage = () => {
    const errors: string[] = []
    
    currentQuestions.forEach((question: DynamicQuestion) => {
      const answerKey = `stage_${currentStage}_${question.id}`
      const answer = answers[answerKey]
      
      if (question.required && !answer) {
        errors.push(`${question.label} is required`)
      }
    })
    
    return errors
  }

  const handleContinue = async () => {
    // Mark all questions in current stage as touched
    currentQuestions.forEach((question: DynamicQuestion) => {
      setTouched(prev => ({
        ...prev,
        [`stage_${currentStage}_${question.id}`]: true
      }))
    })
    
    const errors = validateCurrentStage()
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    
    await saveAnswers()
    await scrollToTopSmooth()
    setIsExiting(true)
    const localExitKey = Date.now()
    setExitKey(localExitKey)
    await new Promise(r => setTimeout(r, 250))

    if (currentStage < totalStages - 1) {
      const next = currentStage + 1
      setCurrentStage(next)
      persistCurrentStage(next)
      setIsExiting(false)
    } else {
      await handleSubmit()
      setIsExiting(false)
    }
  }

  const handleBack = () => {
    if (currentStage > 0) {
      const prev = currentStage - 1
      setCurrentStage(prev)
      persistCurrentStage(prev)
      scrollToTopSmooth()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Ensure current stage is saved without modifying status (DB constraint allows only 'draft' or 'submitted')
      await saveAnswers()

      // Show final report loader inside the master container body
      await scrollToTopSmooth()
      setIsExiting(true)
      setExitKey(Date.now())
      await new Promise(r => setTimeout(r, 250))
      setShowFinalReportLoader(true)
      setIsExiting(false)

      // Trigger serverless API to generate final report
      try {
        const resp = await fetch('/api/final-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId })
        })
        if (!resp.ok) {
          const body = await resp.text()
          console.error('Final report generation failed:', body)
          toast.error('Failed to generate final report. Please try again.')
          // Keep the loading screen up – the background job may still complete; the loader will poll Supabase
        }
      } catch (e) {
        console.error('Final report request error:', e)
        toast.error('Could not contact AI service for final report.')
        // Keep the loading screen up to allow polling fallback
      }
    } catch (error) {
      console.error('Error submitting answers:', error)
      toast.error('Failed to submit answers. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStageProgress = (stageIndex: number) => {
    const stageQuestions = stages[stageIndex]?.questions || []
    let answered = 0
    
    stageQuestions.forEach((question: DynamicQuestion) => {
      const answerKey = `stage_${stageIndex}_${question.id}`
      if (answers[answerKey]) answered++
    })
    
    return stageQuestions.length > 0 ? (answered / stageQuestions.length) * 100 : 0
  }

  // Animation variants
  const stageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -30 : 30,
      opacity: 0
    })
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="glass-card rounded-2xl px-6 sm:px-8 pt-6 sm:pt-8 pb-2 shadow-xl">
        {/* Unified header with integrated progress bar */}
        <QuestionnaireHeader
          icon={<Sparkles className="w-full h-full" />}
          title={HEADER_TITLE}
          subtitle={getDynamicSubheading(stageName, stageDescription, currentStage, totalStages)}
          useSharedContainer
          embedded
          flat
          showProgress
          showDivider
        >
          <ProgressIndicator
            currentStage={currentStage}
            totalStages={totalStages}
            stages={stages.map((stage: any, index: number) => ({
              name: stage.name,
              progress: getStageProgress(index)
            }))}
            onStageClick={(index) => {
              if (index <= currentStage) {
                setCurrentStage(index)
                persistCurrentStage(index)
              }
            }}
          />
        </QuestionnaireHeader>

        {/* Divider is handled within header for consistency */}

        <main className="relative z-10 pt-6 pb-2">
          <div className="mt-8">
          {/* Auto-save indicator */}
          <AnimatePresence>
            {showSaveIndicator && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-2 right-4 flex items-center gap-2 text-xs text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-full z-20"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Progress saved</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress indicator moved to header */}

          {/* Form Content within master container (no inner card) */}
          {!showFinalReportLoader ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isExiting ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stage Header */}
            <div className="mb-8">
              <AnimatePresence mode="wait" custom={currentStage}>
                <motion.div
                  key={currentStage}
                  variants={stageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                >
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {stageName}
                  </h2>
                  {stageDescription && (
                    <p className="text-white/80">
                      {stageDescription}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Questions with staggered animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {currentQuestions.map((question: DynamicQuestion, index: number) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.08,
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    className="motion-safe:animate-fade-in-up"
                  >
                    <DynamicQuestionInput
                      question={question}
                      value={answers[`stage_${currentStage}_${question.id}`]}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                      touched={touched[`stage_${currentStage}_${question.id}`]}
                      onBlur={() => setTouched(prev => ({
                        ...prev,
                        [`stage_${currentStage}_${question.id}`]: true
                      }))}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Brand divider between form body and navigation/info */}
            <div className="mt-10 mb-8 px-1 sm:px-2">
              <div className="h-0.5 bg-gradient-to-r from-primary-400/0 via-primary-400/60 to-primary-400/0 rounded-full" />
            </div>

            {/* Navigation Buttons */}
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStage === 0}
                className={`
                  inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                  ${currentStage === 0 
                    ? 'text-white/30 cursor-not-allowed' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-3 text-sm text-white/50">
                <span>Stage {currentStage + 1} of {totalStages}</span>
                {getStageProgress(currentStage) > 0 && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <span>{Math.round(getStageProgress(currentStage))}% complete</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className={`
                  inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all transform
                  ${currentStage === totalStages - 1 
                    ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                    : 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  active:scale-95 pressable
                `}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Processing...
                  </>
                ) : currentStage === totalStages - 1 ? (
                  <>
                    Complete Assessment
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
          ) : (
            <motion.div
              key="final-report-loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <FinalReportLoadingScreen
                embedded
                recordId={recordId}
                processingLabel="Generating your Final Blueprint"
                onComplete={() => {
                  setShowFinalReportLoader(false)
                  toast.success('Final report generated!')
                  if (onComplete) onComplete(answers)
                }}
                onFail={() => {
                  setShowFinalReportLoader(false)
                  toast.error('Final report generation failed.')
                }}
              />
            </motion.div>
          )}

          {/* Helper Text */}
          {!showFinalReportLoader && (
          <motion.div
            className="mt-2 text-center pb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-white/40">
              Your progress is automatically saved • Reference: {starmapId || recordId}
            </p>
          </motion.div>
          )}
        </div>
      </main>
        </div>
    </div>
  </div>
  )
}