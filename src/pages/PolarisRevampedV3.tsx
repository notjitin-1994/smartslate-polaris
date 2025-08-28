import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  createStarmapJob,
  updateStarmapJobStageData,
  saveDynamicQuestions,
  checkAsyncJobStatus,
  saveSessionState,
  resumeStarmapJob,
  updateStarmapJobTitle,
  submitStarmapJobForProcessing,
  type StarmapJob
} from '@/services/starmapJobsService'
import { callLLM } from '@/services/llmClient'
import RenderField from '@/polaris/needs-analysis/RenderField'
import { EnhancedReportDisplay, IconButton } from '@/components'
import { regenerateStarmapFinalReportWithContext, buildComprehensiveReportPrompt } from '@/services/reportGenerationService'
import { 
  NA_DYNAMIC_STAGES_PROMPT 
} from '@/polaris/needs-analysis/prompts'
import { tryExtractJson } from '@/polaris/needs-analysis/json'
import { POLARIS_STATIC_SECTIONS } from '@/polaris/needs-analysis/staticSections'

import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'
import { 
  StepIndicator, 
  WizardContainer, 
  ActionButtons 
} from '@/components'

import { reportDebugStore } from '@/dev/reportDebug'

// Local draft helpers
function loadLocalDraft(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function saveLocalDraft(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

const STATIC_STEPS = POLARIS_STATIC_SECTIONS.map(s => ({ id: s.id, label: s.title, description: s.description || '' }))
const STEPS = [
  ...STATIC_STEPS,
  { id: 'dynamic', label: 'Deep Dive', description: 'Personalized follow-ups.' },
  { id: 'report', label: 'Your Starmap', description: 'View and edit your report.' }
]

const STEP_SHORT_LABELS: Record<string, string> = {
  org_audience: 'Org',
  business_context: 'Business',
  project_requirements: 'Project',
  resources_constraints: 'Constraints',
  systems_data: 'Data',
  timeline_scheduling: 'Timeline',
  risk_change: 'Risk',
  learning_transfer: 'Transfer',
  performance_support: 'Support',
  documentation: 'Documentation',
  dynamic: 'Dynamic',
  report: 'Final'
}

export default function PolarisRevampedV3() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const initOnceRef = useRef(false)
  
  // Job state
  const [job, setJob] = useState<StarmapJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [active, setActive] = useState(STATIC_STEPS[0]?.id || 'dynamic')
  const [staticAnswers, setStaticAnswers] = useState<NAResponseMap>({})
  const [dynamicQuestions, setDynamicQuestions] = useState<NAField[]>([])
  const [dynamicAnswers, setDynamicAnswers] = useState<NAResponseMap>({})
  
  // Report state
  const [report, setReport] = useState<string>('')
  const [parsedReport, setParsedReport] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  
  // Async job state
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null)
  const [asyncStatus, setAsyncStatus] = useState<string | null>(null)
  const [asyncProgress, setAsyncProgress] = useState(0)
  const [asyncPhase, setAsyncPhase] = useState<string>('')
  const [asyncMessage, setAsyncMessage] = useState<string>('')
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Regenerate UI state
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenText, setRegenText] = useState('')
  const [regenJson, setRegenJson] = useState<any>(null)
  const [regenJsonName, setRegenJsonName] = useState<string | null>(null)
  const [regenJsonError, setRegenJsonError] = useState<string | null>(null)
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [preserveStructure, setPreserveStructure] = useState(true)
  const [updateOnlySelected, setUpdateOnlySelected] = useState(false)
  
  // Load or create job on mount (guard against StrictMode double-invocation)
  useEffect(() => {
    if (!initOnceRef.current) {
      initOnceRef.current = true
      initializeJob()
    }
    
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Open regeneration modal if requested via query param
  useEffect(() => {
    try {
      const shouldOpen = searchParams.get('openRegen') === '1'
      if (shouldOpen) setRegenOpen(true)
    } catch {}
  }, [searchParams])
  
  // Smoothly scroll to top on step change for clearer transitions
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {}
  }, [active])
  
  // Auto-save on changes
  useEffect(() => {
    if (!job) return
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Save local drafts immediately for resilient resume
    saveLocalDraft('polaris:staticAnswers', staticAnswers)
    saveLocalDraft('polaris:dynamicAnswers', dynamicAnswers)

    autoSaveTimerRef.current = setTimeout(() => {
      saveProgress()
    }, 1000)
  }, [staticAnswers, dynamicAnswers])
  
  async function initializeJob() {
    try {
      setLoading(true)
      reportDebugStore.info('job_init', { message: 'Initializing discover flow' })
      
      // Check if resuming an existing job
      const jobId = searchParams.get('jobId')
      
      if (jobId) {
        // Resume existing job
        const { data, error } = await resumeStarmapJob(jobId)
        
        if (error || !data) {
          console.error('Failed to resume job:', error)
          // Create new job if resume fails
          await createNewJob()
        } else {
          setJob(data)
          reportDebugStore.info('job_init', { jobId: data.id, message: 'Resumed existing job' })
          restoreJobState(data)
          // Merge local drafts if newer (best-effort)
          const localStatic = loadLocalDraft('polaris:staticAnswers')
          const localDynamic = loadLocalDraft('polaris:dynamicAnswers')
          if (localStatic && Object.keys(localStatic).length > 0) setStaticAnswers((prev) => ({ ...prev, ...localStatic }))
          if (localDynamic && Object.keys(localDynamic).length > 0) setDynamicAnswers((prev) => ({ ...prev, ...localDynamic }))
        }
      } else {
        // Create new job
        await createNewJob()
      }
    } catch (err) {
      console.error('Error initializing job:', err)
      setError('Failed to initialize. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  async function createNewJob() {
    const { data, error } = await createStarmapJob({
      title: 'New Starmap Discovery'
    })
    
    if (error || !data) {
      setError('Failed to create job. Please try again.')
      return
    }
    
    setJob(data)
    reportDebugStore.success('job_init', { jobId: data.id, message: 'Created new job' })
  }
  
  function restoreJobState(job: StarmapJob) {
    // Restore static and dynamic data
    setStaticAnswers(job.stage3_data || {})
    setDynamicAnswers(job.dynamic_answers || {})
    setDynamicQuestions(job.dynamic_questions || [])
    
    // Restore report
    if (job.final_report) {
      setReport(job.final_report)
      const parsed = parseMarkdownToReport(job.final_report)
      setParsedReport(parsed)
    } else if (job.preliminary_report) {
      setReport(job.preliminary_report)
      const parsed = parseMarkdownToReport(job.preliminary_report)
      setParsedReport(parsed)
    }
    
    // Restore session state
    if (job.session_state) {
      if (job.session_state.active) {
        setActive(job.session_state.active)
      }
      if (job.session_state.asyncJobId) {
        setAsyncJobId(job.session_state.asyncJobId)
      }
      if (job.session_state.asyncStatus) {
        setAsyncStatus(job.session_state.asyncStatus)
      }
    }
    
    // Resume polling if job is processing
    if (job.status === 'processing' && job.report_job_id) {
      setAsyncJobId(job.report_job_id)
              setAsyncStatus('processing')
        const loadingInfo = getLoadingMessage('processing', 0)
        setAsyncPhase(loadingInfo.phase)
        setAsyncMessage(loadingInfo.message)
        startPolling(job.id)
        reportDebugStore.info('resume_polling', { jobId: job.id, message: 'Resuming polling for in-progress job' })
    }
    
    // Navigate to appropriate step
    if (job.status === 'completed' && (job.final_report || job.preliminary_report)) {
      setActive('report')
    } else if (job.dynamic_complete) {
      setActive('dynamic')
    } else if (job.session_state?.active) {
      setActive(job.session_state.active)
    } else {
      setActive(STATIC_STEPS[0]?.id || 'dynamic')
    }
  }
  
  async function saveProgress() {
    if (!job || saving) return
    
    try {
      setSaving(true)
      
      // Save current data: persist all static answers under stage3 to avoid schema changes
      if (STATIC_STEPS.some(s => s.id === active)) {
        if (Object.keys(staticAnswers).length > 0) {
          await updateStarmapJobStageData(job.id, 'stage3', staticAnswers)
          reportDebugStore.success('stage_saved', { jobId: job.id, step: active, data: { count: Object.keys(staticAnswers).length } })
        }
      } else if (active === 'dynamic' && Object.keys(dynamicAnswers).length > 0) {
        await updateStarmapJobStageData(job.id, 'dynamic', dynamicAnswers)
        reportDebugStore.success('stage_saved', { jobId: job.id, step: 'dynamic', data: { count: Object.keys(dynamicAnswers).length } })
      }
      
      // Save session state
      await saveSessionState(job.id, {
        active,
        asyncJobId,
        asyncStatus,
        history: {
          lastUpdated: new Date().toISOString(),
          staticAnswers,
          dynamicAnswers,
        },
        lastSaved: new Date().toISOString()
      })
      reportDebugStore.info('save_state', { jobId: job.id, data: { active, asyncStatus } })
    } catch (err) {
      console.error('Error saving progress:', err)
    } finally {
      setSaving(false)
    }
  }
  
  async function generateDynamicQuestions() {
    if (!job) return
    
    try {
      setGenerating(true)
      setGenerationProgress('Generating personalized questions...')
      
      const bySection = (sectionId: string): Record<string, unknown> => {
        const section = POLARIS_STATIC_SECTIONS.find(s => s.id === sectionId)
        const map: Record<string, unknown> = {}
        if (section) {
          for (const f of section.fields) {
            if (Object.prototype.hasOwnProperty.call(staticAnswers, f.id)) {
              map[f.id] = (staticAnswers as any)[f.id]
            }
          }
        }
        return map
      }
      const { system, user } = NA_DYNAMIC_STAGES_PROMPT({
        companyName: (staticAnswers['org_name'] as string) || '',
        experienceLevel: 'Experienced',
        stage1Answers: {},
        stage2Answers: bySection('org_audience'),
        stage3Answers: bySection('project_requirements'),
        requirementsStatic: bySection('project_requirements'),
        learningTransferStatic: bySection('learning_transfer'),
        performanceSupportStatic: bySection('performance_support'),
        documentationStatic: bySection('documentation'),
        preliminaryReport: job.preliminary_report || '',
        greetingReport: '',
        orgReport: '',
        requirementsReport: '',
        previousDynamic: dynamicAnswers
      })
      
      const response = await callLLM([
        { role: 'system', content: system },
        { role: 'user', content: user }
      ])
      const jsonStr = tryExtractJson(response.content)
      const parsed = JSON.parse(jsonStr)
      const stages = Array.isArray(parsed?.stages) ? parsed.stages : []
      const rawQuestions: any[] = stages.flatMap((s: any) => Array.isArray(s?.questions) ? s.questions : [])
      const questions = rawQuestions.map((q: any) => {
        const type = String(q.type || '').toLowerCase()
        const base: any = {
          id: q.id,
          label: q.label,
          help: q.help,
          required: q.required === true,
          type
        }
        if (type === 'single_select' || type === 'multi_select') {
          const opts = Array.isArray(q.options) ? q.options : []
          base.options = opts
            .map((o: any) => typeof o === 'string' ? o : (o?.label || o?.value))
            .filter((s: any) => typeof s === 'string' && s.length > 0)
        } else if (type === 'slider') {
          base.min = typeof q.min === 'number' ? q.min : 0
          base.max = typeof q.max === 'number' ? q.max : 100
          if (typeof q.step === 'number') base.step = q.step
          if (typeof q.unit === 'string') base.unit = q.unit
        } else if (type === 'number') {
          if (typeof q.min === 'number') base.min = q.min
          if (typeof q.max === 'number') base.max = q.max
          if (typeof q.step === 'number') base.step = q.step
          if (typeof q.unit === 'string') base.unit = q.unit
        }
        return base
      })
      
      if (questions.length > 0) {
        setDynamicQuestions(questions)
        await saveDynamicQuestions(job.id, questions)
        reportDebugStore.success('dynamic_success', { jobId: job.id, data: { count: questions.length } })
        // Keep prompt + result in session history
        await saveSessionState(job.id, {
          active,
          lastSaved: new Date().toISOString(),
          dynamicPrompt: { system, user },
          dynamicRaw: response.content
        })
      }
    } catch (err) {
      console.error('Error generating dynamic questions:', err)
      setError('Failed to generate questions. Please try again.')
      reportDebugStore.error('dynamic_error', { jobId: job?.id, message: (err as any)?.message })
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }
  
  async function generateReport() {
    if (!job) return
    
    try {
      setGenerating(true)
      setGenerationProgress('Generating your comprehensive starmap...')

      const bySection = (sectionId: string): Record<string, unknown> => {
        const section = POLARIS_STATIC_SECTIONS.find(s => s.id === sectionId)
        const map: Record<string, unknown> = {}
        if (section) {
          for (const f of section.fields) {
            if (Object.prototype.hasOwnProperty.call(staticAnswers, f.id)) {
              map[f.id] = (staticAnswers as any)[f.id]
            }
          }
        }
        return map
      }

      const context: any = {
        jobId: job.id,
        userId: (user as any)?.id || '',
        experienceLevel: 'intermediate',
        companyName: (staticAnswers['org_name'] as string) || job.title || 'Organization',
        orgData: bySection('org_audience'),
        requirementsData: bySection('project_requirements'),
        dynamicAnswers,
        requirementsStatic: bySection('project_requirements'),
        learningTransferStatic: bySection('learning_transfer'),
        performanceSupportStatic: bySection('performance_support'),
        documentationStatic: bySection('documentation')
      }

      // Build prompt and submit async job so user can navigate away and return later
      const prompt = buildComprehensiveReportPrompt(context)
      reportDebugStore.info('report_prompt_built', { jobId: job.id, data: { length: prompt.length } })

      const submit = await submitStarmapJobForProcessing(job.id, prompt, 'sonar-pro', 'final')
      if (submit.error || !submit.data) {
        throw submit.error || new Error('Failed to submit job')
      }
      setActive('report')
      setAsyncJobId(submit.data.jobId)
      setAsyncStatus('processing')
      setAsyncProgress(0)
      const loadingInfo = getLoadingMessage('processing', 0)
      setAsyncPhase(loadingInfo.phase)
      setAsyncMessage(loadingInfo.message)
      reportDebugStore.info('job_submit', { jobId: job.id, message: 'Submitted async job', data: { asyncJobId: submit.data.jobId } })
      startPolling(job.id)
    } catch (err) {
      console.error('Error generating report:', err)
      setError('Failed to generate report. Please try again.')
      setGenerating(false)
      setGenerationProgress('')
    }
  }
  
  function startPolling(jobId: string) {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
    }
    
    pollTimerRef.current = setInterval(async () => {
      const { data, error } = await checkAsyncJobStatus(jobId)
      
      if (error) {
        console.error('Error checking job status:', error)
        return
      }
      
      if (!data) return
      
      setAsyncStatus(data.status)
      setAsyncProgress(data.progress)
      reportDebugStore.info('poll_status', { jobId, progress: data.progress, data })
      
      // Update dynamic loading messages
      const loadingInfo = getLoadingMessage(data.status, data.progress)
      setAsyncPhase(loadingInfo.phase)
      setAsyncMessage(loadingInfo.message)
      
      if (data.status === 'succeeded' && data.result) {
        // Job completed successfully
        setReport(data.result)
        const parsed = parseMarkdownToReport(data.result)
        setParsedReport(parsed)
        setGenerating(false)
        setGenerationProgress('')
        
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
        
        // Update job to show it's complete
        if (job) {
          setJob({ ...job, status: 'completed', final_report: data.result })
        }
        reportDebugStore.success('job_complete', { jobId, message: 'Final report generated' })
      } else if (data.status === 'failed') {
        // Job failed
        setError(data.error || 'Report generation failed. Please try again.')
        setGenerating(false)
        setGenerationProgress('')
        
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
        reportDebugStore.error('job_failed', { jobId, message: data.error })
      }
    }, 3000) // Poll every 3 seconds
  }
  
  function getStepIndex(stepId: string): number {
    return STEPS.findIndex(s => s.id === stepId)
  }

  function getLoadingMessage(status: string, progress: number): { title: string; message: string; phase: string } {
    switch (status) {
      case 'queued':
        return {
          title: 'Your Starmap is Queued',
          message: 'We\'re preparing to generate your personalized L&D starmap. This typically takes 1-2 minutes.',
          phase: 'queued'
        }
      case 'running':
        if (progress < 20) {
          return {
            title: 'Analyzing Your Inputs',
            message: 'Processing your organization details and project requirements to create targeted questions.',
            phase: 'analyzing'
          }
        } else if (progress < 40) {
          return {
            title: 'Researching Best Practices',
            message: 'Gathering industry insights and L&D methodologies relevant to your situation.',
            phase: 'researching'
          }
        } else if (progress < 60) {
          return {
            title: 'Crafting Your Strategy',
            message: 'Developing personalized recommendations and action plans based on your unique context.',
            phase: 'crafting'
          }
        } else if (progress < 80) {
          return {
            title: 'Finalizing Your Starmap',
            message: 'Polishing the details and ensuring all recommendations are actionable and well-structured.',
            phase: 'finalizing'
          }
        } else {
          return {
            title: 'Almost Complete!',
            message: 'Adding final touches and preparing your comprehensive L&D starmap for delivery.',
            phase: 'completing'
          }
        }
      case 'processing':
        return {
          title: 'Processing Your Request',
          message: 'Setting up the AI analysis pipeline and preparing to generate your starmap.',
          phase: 'processing'
        }
      default:
        return {
          title: 'Your Starmap is Being Generated',
          message: 'You can safely navigate away and return later. We\'ll save your report when it\'s ready.',
          phase: 'generating'
        }
    }
  }
  
  function isFieldAnswered(field: NAField, value: unknown): boolean {
    if (!field.required) return true
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'single_select':
        return typeof value === 'string' && value.trim().length > 0
      case 'multi_select':
        return Array.isArray(value) && value.length > 0
      case 'calendar_date':
        return typeof value === 'string' && value.length > 0
      case 'calendar_range': {
        const v = (value || {}) as { start?: string; end?: string }
        return typeof v.start === 'string' && v.start.length > 0 && typeof v.end === 'string' && v.end.length > 0
      }
      case 'number':
      case 'slider':
        return value !== null && value !== undefined && value !== ''
      case 'boolean':
        return typeof value === 'boolean'
      default:
        return Boolean(value)
    }
  }
  
  function canProceedToNext(): boolean {
    if (active === 'dynamic') {
      return dynamicQuestions.length === 0 || dynamicQuestions.every(f => isFieldAnswered(f, dynamicAnswers[f.id]))
    }
    const section = POLARIS_STATIC_SECTIONS.find(s => s.id === active)
    if (!section) return true
    return section.fields.every(f => isFieldAnswered(f, staticAnswers[f.id]))
  }
  
  async function handleNext() {
    if (!canProceedToNext() || !job) return
    
    await saveProgress()
    
    const currentIndex = getStepIndex(active)
    
    const staticStepIds = STATIC_STEPS.map(s => s.id)
    const isLastStatic = staticStepIds[staticStepIds.length - 1] === active
    if (isLastStatic && dynamicQuestions.length === 0) {
      // Generate dynamic questions after stage 3
      await generateDynamicQuestions()
      setActive('dynamic')
    } else if (active === 'dynamic') {
      // Generate report after dynamic questions
      await generateReport()
    } else if (currentIndex < STEPS.length - 1) {
      setActive(STEPS[currentIndex + 1].id)
    }
  }
  
  function handlePrevious() {
    const currentIndex = getStepIndex(active)
    if (currentIndex > 0) {
      setActive(STEPS[currentIndex - 1].id)
    }
  }
  
  async function handleSaveAndExit() {
    try {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      await saveProgress()
    } catch (err) {
      console.error('Error during save and exit:', err)
    } finally {
      navigate('/')
    }
  }
  
  if (!user) {
    return null
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading your starmap journey...</p>
        </div>
      </div>
    )
  }
  
  const currentStep = STEPS.find(s => s.id === active)
  const currentIndex = getStepIndex(active)
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {/* Header removed per design update */}
      
      {/* Step Indicator */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StepIndicator
          steps={STEPS.map((s) => ({ key: s.id, label: s.label, description: s.description, shortLabel: STEP_SHORT_LABELS[s.id] }))}
          currentStep={currentIndex}
          completedSteps={Array.from({ length: currentIndex }, (_, i) => i)}
          onStepClick={(index) => {
            if (index <= currentIndex) {
              setActive(STEPS[index].id)
            }
          }}
        />
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-100">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        
        {generating && !asyncJobId ? (
          <WizardContainer 
            title="Preparing Your Starmap" 
            description="Setting up the AI analysis pipeline and preparing your personalized questions."
          >
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-lg text-white/80 mb-4">
                {generationProgress || 'Initializing AI analysis...'}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-full">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-primary-300">
                  Preparing
                </span>
              </div>
            </div>
          </WizardContainer>
        ) : active === 'report' && (asyncStatus === 'processing' || asyncStatus === 'queued' || asyncStatus === 'running') ? (
          <WizardContainer 
            title={getLoadingMessage(asyncStatus || 'processing', asyncProgress).title}
            description={asyncMessage || "You can safely navigate away and return later. We'll save your report when it's ready."}
          >
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-primary-500 h-full transition-all duration-500"
                    style={{ width: `${asyncProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-white/60">{asyncProgress}% complete</p>
              </div>
              
              {/* Dynamic Phase Indicator */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 border border-primary-500/30 rounded-full">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-primary-300 capitalize">
                    {asyncPhase || 'processing'}
                  </span>
                </div>
              </div>
              
              <p className="text-lg text-white mb-4">
                {asyncMessage || 'Your personalized L&D starmap is being crafted with advanced AI'}
              </p>
              <p className="text-white/70 mb-8">
                This typically takes 1-2 minutes. Feel free to browse other sections or come back later.
              </p>
              <button
                onClick={() => navigate('/discover')}
                className="btn-primary px-6 py-2"
              >
                View All Starmaps
              </button>
            </div>
          </WizardContainer>
        ) : active === 'report' && parsedReport ? (
          <div className="animate-fade-in">
            <EnhancedReportDisplay 
              reportMarkdown={report}
              reportTitle={job?.title || 'Needs Analysis Report'}
              editableTitle
              onSaveTitle={async (newTitle) => {
                if (!job) return
                const { error } = await updateStarmapJobTitle(job.id, newTitle)
                if (!error) {
                  setJob(prev => prev ? { ...prev, title: newTitle } : prev)
                }
              }}
              showGeneratedDate={false}
              headerActions={(
                <div className="flex items-center gap-2">
                  <IconButton
                    ariaLabel="Add Context & Recreate"
                    title="Add Context & Recreate"
                    variant="plain"
                    onClick={() => setRegenOpen(true)}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 11-18 0" />
                        <path d="M3 12a9 9 0 0118 0" />
                        <path d="M8 12l-2 2 2 2" />
                      </svg>
                    )}
                  </IconButton>
                  <IconButton
                    ariaLabel="Save and Exit"
                    title="Save and Exit"
                    variant="primary"
                    className="icon-btn-lg"
                    onClick={handleSaveAndExit}
                    disabled={saving}
                  >
                    {saving ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                        <path d="M10 17l5-5-5-5" />
                        <path d="M15 12H3" />
                      </svg>
                    )}
                  </IconButton>
                </div>
              )}
            />
          </div>
        ) : (
          <WizardContainer 
            title={currentStep?.label || ''} 
            description={currentStep?.description || ''}
            savedStatus={saving ? 'saving' : 'saved'}
            headerActions={(
              <IconButton
                ariaLabel="Save and Exit"
                title="Save and Exit"
                variant="primary"
                className="icon-btn-lg"
                onClick={handleSaveAndExit}
                disabled={saving}
              >
                {saving ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                )}
              </IconButton>
            )}
          >
            {/* Static Sections */}
            {STATIC_STEPS.some(s => s.id === active) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(POLARIS_STATIC_SECTIONS.find(s => s.id === active)?.fields || []).map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <RenderField
                      field={field}
                      value={staticAnswers[field.id]}
                      onChange={(id, value) => setStaticAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Dynamic Questions */}
            {active === 'dynamic' && (
              <div className="space-y-6">
                {dynamicQuestions.length > 0 ? (
                  dynamicQuestions.map(field => (
                    <div key={field.id}>
                      <RenderField
                        field={field}
                        value={dynamicAnswers[field.id]}
                        onChange={(id, value) => setDynamicAnswers(prev => ({ ...prev, [id]: value }))}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/70 mb-4">Loading personalized questions...</p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto"></div>
                  </div>
                )}
              </div>
            )}
            
            {/* Navigation */}
            <ActionButtons
              onPrevious={currentIndex > 0 ? handlePrevious : undefined}
              onNext={handleNext}
              nextDisabled={!canProceedToNext() || generating}
              nextLabel={
                active === 'dynamic' ? 'Generate Starmap' :
                active === 'stage3' && dynamicQuestions.length === 0 ? 'Continue' :
                'Next'
              }
              previousLabel="Previous"
            />
            
            {/* Save & Exit moved to header; bottom button removed */}
          </WizardContainer>
        )}
      </div>
      {/* Regenerate Modal */}
      {regenOpen && job && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[rgb(var(--bg))]/70 backdrop-blur-sm" onClick={() => !regenerating && setRegenOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-500/20 text-secondary-300 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.37 4.37A9 9 0 0020.49 15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white">Add Context & Recreate</h3>
                    <p className="text-xs md:text-sm text-white/60">Integrate additional details to regenerate the final report</p>
                  </div>
                </div>
                <button
                  onClick={() => setRegenOpen(false)}
                  disabled={regenerating}
                  aria-label="Close"
                  className="icon-btn icon-btn-ghost disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-5 space-y-6 max-h-[72vh] overflow-y-auto brand-scroll">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Additional Context</label>
                    <span className="text-xs text-white/50">Tip: describe updates, constraints, assumptions</span>
                  </div>
                  <textarea
                    className="w-full min-h-[140px] rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400/40 brand-scroll"
                    placeholder="Paste notes, requirements, changes, or clarifications to integrate into the full report..."
                    value={regenText}
                    onChange={(e) => setRegenText(e.target.value)}
                    disabled={regenerating}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Attach JSON (optional)</label>
                    <span className="text-xs text-white/50">Structured data for precise updates</span>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/5 transition p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/85">
                          {regenJson ? (
                            <span>Attached: <span className="text-white/70">{regenJsonName || 'JSON file'}</span></span>
                          ) : (
                            <span>Drag & drop a JSON file here, or click Browse</span>
                          )}
                        </p>
                        <p className="text-xs text-white/50">Max 1 file • .json</p>
                      </div>
                      {!regenJson ? (
                        <label className="px-3 py-2 rounded-lg btn-ghost cursor-pointer">
                          <input
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                              setRegenJsonError(null)
                              const f = e.target.files && e.target.files[0]
                              if (!f) { setRegenJson(null); setRegenJsonName(null); return }
                              const reader = new FileReader()
                              reader.onload = () => {
                                try {
                                  const parsed = JSON.parse(String(reader.result || '{}'))
                                  setRegenJson(parsed)
                                  setRegenJsonName(f.name)
                                } catch (err: any) {
                                  setRegenJsonError('Failed to parse JSON file')
                                  setRegenJson(null)
                                  setRegenJsonName(null)
                                }
                              }
                              reader.readAsText(f)
                            }}
                            disabled={regenerating}
                          />
                          Browse
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setRegenJson(null); setRegenJsonName(null) }}
                          className="px-3 py-2 rounded-lg btn-ghost"
                          disabled={regenerating}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {regenJsonError && (
                      <p className="mt-2 text-xs text-red-300">{regenJsonError}</p>
                    )}
                    {regenJson && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-white/60">Preview JSON</summary>
                        <pre className="mt-2 p-2 bg-black/20 rounded text-white/70 overflow-x-auto text-xs max-h-40">{JSON.stringify(regenJson, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Focus Areas (optional)</label>
                    <span className="text-xs text-white/50">Highlight sections to prioritize</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Executive Summary',
                      'Organization & Audience',
                      'Business Objectives & Requirements',
                      'Learning Transfer & Sustainment',
                      'Performance Support',
                      'Documentation',
                      'Delivery & Modalities',
                      'Systems, Data & Integration',
                      'Resourcing, Budget & Timeline',
                      'Risks & Change Readiness',
                      'Recommendations & Next Steps'
                    ].map((area) => {
                      const selected = focusAreas.includes(area)
                      return (
                        <button
                          key={area}
                          type="button"
                          className={`px-3 py-1.5 rounded-full border text-sm transition ${selected ? 'bg-secondary-500/20 text-white border-secondary-400/40' : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'}`}
                          onClick={() => setFocusAreas((prev) => selected ? prev.filter(a => a !== area) : [...prev, area])}
                          disabled={regenerating}
                        >
                          {area}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm text-white">Preserve original structure</p>
                      <p className="text-xs text-white/60">Maintain section order and headings</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preserveStructure}
                      onClick={() => setPreserveStructure(v => !v)}
                      disabled={regenerating}
                      className={`w-11 h-6 rounded-full transition relative ${preserveStructure ? 'bg-secondary-500/60' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${preserveStructure ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm text-white">Only update selected sections</p>
                      <p className="text-xs text-white/60">Limit changes to chosen focus areas</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={updateOnlySelected}
                      onClick={() => setUpdateOnlySelected(v => !v)}
                      disabled={regenerating}
                      className={`w-11 h-6 rounded-full transition relative ${updateOnlySelected ? 'bg-secondary-500/60' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${updateOnlySelected ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-2">
                <p className="hidden sm:block text-xs text-white/50">Recreation typically completes in under 2 minutes.</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRegenOpen(false)}
                    className="px-5 py-2 rounded-lg btn-ghost"
                    disabled={regenerating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!job) return
                      try {
                        setRegenerating(true)
                        const result = await regenerateStarmapFinalReportWithContext(job.id, {
                          newContextText: regenText,
                          newContextJson: regenJson,
                          focusAreas,
                          preserveStructure,
                          updateOnlySelectedSections: updateOnlySelected
                        })
                        setReport(result.content)
                        try { setParsedReport(parseMarkdownToReport(result.content)) } catch {}
                        setRegenOpen(false)
                        setRegenText('')
                        setRegenJson(null)
                        setRegenJsonName(null)
                        setFocusAreas([])
                        setPreserveStructure(true)
                        setUpdateOnlySelected(false)
                      } catch (e) {
                        console.error('Regeneration failed:', e)
                        setError('Failed to recreate report. Please try again.')
                      } finally {
                        setRegenerating(false)
                      }
                    }}
                    className="px-6 py-2 rounded-lg btn-primary disabled:opacity-50"
                    disabled={regenerating || (!regenText && !regenJson)}
                  >
                    {regenerating ? 'Recreating…' : 'Recreate Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
