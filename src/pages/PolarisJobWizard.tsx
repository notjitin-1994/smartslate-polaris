import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  createJob,
  getJob,
  updateJobStageData,
  saveJobReport,
  saveDynamicQuestions,
  updateJobProgress,
  saveSessionState,
  resumeJob,
  type PolarisJob,
  type PolarisJobStage
} from '@/services/polarisJobsService'
import { 
  researchGreeting, 
  researchOrganization, 
  researchRequirements 
} from '@/services/perplexityService'
import { callLLM } from '@/services/llmClient'
import RenderField from '@/polaris/needs-analysis/RenderField'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { EXPERIENCE_LEVELS } from '@/polaris/needs-analysis/experience'
import { 
  STAGE1_REQUESTER_FIELDS, 
  STAGE2_ORGANIZATION_FIELDS, 
  STAGE3_PROJECT_FIELDS 
} from '@/polaris/needs-analysis/three-stage-static'
import { 
  NA_QUESTIONNAIRE_PROMPT 
} from '@/polaris/needs-analysis/prompts'
import { buildFastNAReportPrompt } from '@/polaris/needs-analysis/report'
import { tryExtractJson } from '@/polaris/needs-analysis/json'
import { formatReportAsMarkdown } from '@/polaris/needs-analysis/format'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'
import { useAuth } from '@/contexts/AuthContext'

// Stage configuration
const STAGES: { id: PolarisJobStage; label: string; fields?: NAField[] }[] = [
  { id: 'greeting', label: 'Initial Information', fields: STAGE1_REQUESTER_FIELDS },
  { id: 'organization', label: 'Organization Details', fields: STAGE2_ORGANIZATION_FIELDS },
  { id: 'requirements', label: 'Project Requirements', fields: STAGE3_PROJECT_FIELDS },
  { id: 'preliminary', label: 'Preliminary Report' },
  { id: 'dynamic_questions', label: 'Dynamic Questionnaire' },
  { id: 'final_report', label: 'Final Report' }
]

export default function PolarisJobWizard() {
  const { jobId, mode } = useParams<{ jobId?: string; mode?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Job state
  const [job, setJob] = useState<PolarisJob | null>(null)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [experienceLevel, setExperienceLevel] = useState<string>('')
  const [stageAnswers, setStageAnswers] = useState<NAResponseMap>({})
  const [dynamicQuestions, setDynamicQuestions] = useState<NAField[]>([])
  const [dynamicAnswers, setDynamicAnswers] = useState<NAResponseMap>({})
  
  // Report generation state
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [currentReport, setCurrentReport] = useState('')
  const [showReportPreview, setShowReportPreview] = useState(false)
  const [previewStage, setPreviewStage] = useState<PolarisJobStage | null>(null)
  // Async prelim generation state
  const [prelimJobId, setPrelimJobId] = useState<string | null>(null)
  const [prelimStatus, setPrelimStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [prelimProgress, setPrelimProgress] = useState<number>(0)
  const [prelimError, setPrelimError] = useState<string | null>(null)
  const prelimPollTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Refs
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const didInitRef = useRef<boolean>(false)
  
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    initializeWizard()
    
    // Auto-save on unmount
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
      if (prelimPollTimer.current) {
        clearInterval(prelimPollTimer.current)
      }
      if (job && currentStageIndex < STAGES.length - 1) {
        saveProgress()
      }
    }
  }, [])
  
  async function initializeWizard() {
    try {
      setLoading(true)
      
      if (jobId && mode === 'resume') {
        // Resume existing job
        const { data, error } = await resumeJob(jobId)
        if (error || !data) {
          setError('Failed to resume job')
          navigate('/polaris/jobs')
          return
        }
        
        setJob(data)
        restoreJobState(data)
      } else if (jobId) {
        // Load existing job for viewing/continuing
        const { data, error } = await getJob(jobId)
        if (error || !data) {
          setError('Failed to load job')
          navigate('/polaris/jobs')
          return
        }
        
        setJob(data)
        restoreJobState(data)
      } else {
        // Create new job
        const { data, error } = await createJob({
          title: 'New Polaris Starmap',
          experience_level: experienceLevel
        })
        
        if (error || !data) {
          setError('Failed to create job')
          return
        }
        
        setJob(data)
      }
    } catch (err) {
      console.error('Error initializing wizard:', err)
      setError('Failed to initialize wizard')
    } finally {
      setLoading(false)
    }
  }
  
  function restoreJobState(job: PolarisJob) {
    // Restore stage index
    const stageIndex = STAGES.findIndex(s => s.id === job.current_stage)
    setCurrentStageIndex(stageIndex >= 0 ? stageIndex : 0)
    
    // Restore form data
    setExperienceLevel(job.experience_level || '')
    
    // Restore answers based on current stage
    if (job.current_stage === 'greeting' || job.stages_completed.includes('greeting')) {
      setStageAnswers(job.greeting_data)
    } else if (job.current_stage === 'organization' || job.stages_completed.includes('organization')) {
      setStageAnswers(job.org_data)
    } else if (job.current_stage === 'requirements' || job.stages_completed.includes('requirements')) {
      setStageAnswers(job.requirements_data)
    } else if (job.current_stage === 'dynamic_questions') {
      setDynamicQuestions(job.dynamic_questions)
      setDynamicAnswers(job.dynamic_answers)
    }
    
    // Restore reports
    if (job.preliminary_report) setCurrentReport(job.preliminary_report)
    else if (job.final_report) setCurrentReport(job.final_report)
    
    // Restore session state if available
    if (job.session_state.dynamicQuestions) {
      setDynamicQuestions(job.session_state.dynamicQuestions)
    }
    // Restore prelim async state if present
    const prelim = (job.session_state as any)?.prelim
    if (prelim) {
      if (prelim.jobId) setPrelimJobId(prelim.jobId)
      if (prelim.status) setPrelimStatus(prelim.status)
      if (typeof prelim.progress === 'number') setPrelimProgress(prelim.progress)
      if (prelim.error) setPrelimError(prelim.error)
      if (prelim.status === 'processing' && prelim.jobId) {
        startPrelimPolling(prelim.jobId)
      }
    }

    // If resuming and preliminary report already exists, show preview immediately
    if (job.current_stage === 'preliminary' && job.preliminary_report) {
      setCurrentReport(job.preliminary_report)
      setShowReportPreview(true)
      setPreviewStage('preliminary')
    }
    // If resuming and final report already exists, show final preview
    if (job.current_stage === 'final_report' && job.final_report) {
      setCurrentReport(job.final_report)
      setShowReportPreview(true)
      setPreviewStage('final_report')
    }
  }
  
  async function saveProgress(pause: boolean = false) {
    if (!job) return
    
    try {
      setSaving(true)
      
      const currentStage = STAGES[currentStageIndex].id
      
      // Save stage data
      if (currentStage === 'greeting') {
        await updateJobStageData(job.id, 'greeting', stageAnswers)
      } else if (currentStage === 'organization') {
        await updateJobStageData(job.id, 'organization', stageAnswers)
      } else if (currentStage === 'requirements') {
        await updateJobStageData(job.id, 'requirements', stageAnswers)
      } else if (currentStage === 'dynamic_questions') {
        await updateJobStageData(job.id, 'dynamic_questions', dynamicAnswers)
      }
      
      // Save session state
      const sessionState = {
        currentStageIndex,
        experienceLevel,
        dynamicQuestions,
        prelim: {
          jobId: prelimJobId,
          status: prelimStatus,
          progress: prelimProgress,
          error: prelimError,
        },
        lastSaved: new Date().toISOString()
      }
      
      await saveSessionState(job.id, sessionState)
      
      // Update progress
      await updateJobProgress(
        job.id,
        currentStage,
        pause ? 'paused' : 'draft',
        false
      )
      
      if (pause) {
        navigate('/polaris/jobs')
      }
    } catch (err) {
      console.error('Error saving progress:', err)
      setError('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }
  
  async function handleStageComplete() {
    if (!job) return
    
    const currentStage = STAGES[currentStageIndex].id
    
    try {
      setGenerating(true)
      
      // Generate reports for content stages
      if (currentStage === 'greeting') {
        setGenerationProgress('Researching greeting context...')
        
        const greetingData = {
          name: stageAnswers.requester_name as string,
          role: stageAnswers.requester_role as string,
          department: stageAnswers.requester_department as string,
          email: stageAnswers.requester_email as string,
          phone: stageAnswers.requester_phone as string,
          timezone: stageAnswers.requester_timezone as string
        }
        
        const greetingReport = await researchGreeting(greetingData)
        await saveJobReport(job.id, 'greeting', greetingReport)
        
        // Save stage data
        await updateJobStageData(job.id, 'greeting', stageAnswers)
        // Show preview and require confirmation before proceeding to Organization
        setCurrentReport(greetingReport)
        setShowReportPreview(true)
        setPreviewStage('greeting')
        return
      } else if (currentStage === 'organization') {
        setGenerationProgress('Researching organization...')
        
        const orgData = {
          orgName: stageAnswers.org_name as string,
          industry: stageAnswers.org_industry as string,
          size: stageAnswers.org_size as string,
          headquarters: stageAnswers.org_headquarters as string,
          website: stageAnswers.org_website as string,
          mission: stageAnswers.org_mission as string
        }
        
        const orgReport = await researchOrganization(orgData)
        await saveJobReport(job.id, 'org', orgReport)
        
        // Save stage data
        await updateJobStageData(job.id, 'organization', stageAnswers)
      } else if (currentStage === 'requirements') {
        setGenerationProgress('Researching requirements...')
        
        const reqData = {
          objectives: stageAnswers.project_objectives as string,
          constraints: stageAnswers.project_constraints as string,
          audience: stageAnswers.target_audience as string,
          timeline: (() => {
            const r = stageAnswers.project_timeline as any
            if (r && typeof r === 'object') {
              const start = (r as { start?: string }).start || ''
              const end = (r as { end?: string }).end || ''
              return [start, end].filter(Boolean).join(' → ')
            }
            return (r as string) || ''
          })(),
          budget: stageAnswers.project_budget_range as string
        }
        
        const reqReport = await researchRequirements(reqData)
        await saveJobReport(job.id, 'requirement', reqReport)
        
        // Save stage data  
        await updateJobStageData(job.id, 'requirements', stageAnswers)
        
        // Generate preliminary report after requirements
        await generatePreliminaryReport()
      } else if (currentStage === 'preliminary') {
        // Generate dynamic questions based on preliminary report
        await generateDynamicQuestions()
      } else if (currentStage === 'dynamic_questions') {
        // Save dynamic answers
        await updateJobStageData(job.id, 'dynamic_questions', dynamicAnswers)
        
        // Generate final report
        await generateFinalReport()
      }
      
      // Mark stage as complete
      await updateJobProgress(
        job.id,
        currentStage,
        'draft',
        true
      )
      
      // Move to next stage
      if (currentStageIndex < STAGES.length - 1) {
        setCurrentStageIndex(currentStageIndex + 1)
        setStageAnswers({}) // Reset for next stage
      } else {
        // Job complete
        await updateJobProgress(job.id, 'completed', 'completed', true)
        navigate(`/polaris/job/${job.id}`)
      }
    } catch (err) {
      console.error('Error completing stage:', err)
      setError('Failed to complete stage')
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }

  async function handlePreviewContinue() {
    // When previewing a stage's output (e.g., greeting), confirm and advance without re-running generation
    if (!job) return
    if (previewStage === 'greeting' && STAGES[currentStageIndex].id === 'greeting') {
      try {
        // Ensure progress is recorded as complete for greeting
        await updateJobProgress(job.id, 'greeting', 'draft', true)
        setShowReportPreview(false)
        setPreviewStage(null)
        // Advance to Organization stage
        if (currentStageIndex < STAGES.length - 1) {
          setCurrentStageIndex(currentStageIndex + 1)
          setStageAnswers({})
        }
      } catch (err) {
        console.error('Failed to advance from greeting preview:', err)
        setError('Failed to continue to organization')
      }
      return
    }
    // Fallback to original flow
    setShowReportPreview(false)
    await handleStageComplete()
  }
  
  async function generatePreliminaryReport() {
    if (!job) return
    
    setGenerationProgress('Submitting preliminary report job...')
    setPrelimError(null)
    
    const prompt = buildFastNAReportPrompt(experienceLevel, {
      greeting: job.greeting_data,
      org: job.org_data,
      requirements: job.requirements_data
    })
    
    try {
      const resp = await fetch('/api/reportJobsDb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'sonar-pro', temperature: 0.2, max_tokens: 2000 })
      })
      const data = await resp.json()
      if (!resp.ok || !data?.job_id) {
        throw new Error(data?.error || 'Failed to submit preliminary report job')
      }
      setPrelimJobId(data.job_id)
      setPrelimStatus('processing')
      setPrelimProgress(0)
      // begin polling
      startPrelimPolling(data.job_id)
    } catch (err: any) {
      setPrelimError(err?.message || 'Failed to start background job')
      setPrelimStatus('failed')
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }

  async function pollPrelimStatus(jobId: string) {
    try {
      const res = await fetch(`/api/reportJobsDb?job_id=${encodeURIComponent(jobId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (typeof data.percent === 'number') setPrelimProgress(data.percent)
      if (data.status === 'succeeded' && data.result) {
        if (job) {
          await saveJobReport(job.id, 'preliminary', data.result)
        }
        setCurrentReport(data.result)
        setPrelimStatus('completed')
        setShowReportPreview(true)
        if (prelimPollTimer.current) {
          clearInterval(prelimPollTimer.current)
          prelimPollTimer.current = null
        }
      } else if (data.status === 'failed') {
        setPrelimStatus('failed')
        setPrelimError(data.error || 'Preliminary generation failed')
        if (prelimPollTimer.current) {
          clearInterval(prelimPollTimer.current)
          prelimPollTimer.current = null
        }
      }
    } catch {}
  }

  function startPrelimPolling(jobId: string) {
    if (prelimPollTimer.current) clearInterval(prelimPollTimer.current)
    prelimPollTimer.current = setInterval(() => {
      void pollPrelimStatus(jobId)
    }, 3000)
  }
  
  async function generateDynamicQuestions() {
    if (!job) return
    
    setGenerationProgress('Generating dynamic questions...')
    try {
      // Use all available answers to inform dynamic questions
      const staticAnswers = {
        ...(job.greeting_data || {}),
        ...(job.org_data || {}),
        ...(job.requirements_data || {})
      }
      const dynamicSoFar = { ...(dynamicAnswers || {}) }
      const prompt = NA_QUESTIONNAIRE_PROMPT(
        experienceLevel || 'Experienced',
        2,
        staticAnswers,
        dynamicSoFar
      )
      const response = await callLLM([{ role: 'user', content: prompt }])
      const jsonStr = tryExtractJson(response.content)
      const parsed = JSON.parse(jsonStr)
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : []
      if (!questions.length) throw new Error('No questions generated')

      setDynamicQuestions(questions)
      setJob({ ...job, dynamic_questions: questions, current_stage: 'dynamic_questions' })
      // Persist questions for reliable resume and also cache in session state
      await saveDynamicQuestions(job.id, questions)
      await saveSessionState(job.id, {
        ...(job.session_state || {}),
        dynamicQuestions: questions,
        lastSaved: new Date().toISOString()
      })
      // Reflect advancement in backend so resume works correctly
      await updateJobProgress(job.id, 'dynamic_questions', 'draft', false)
    } catch (e) {
      console.error('Failed to generate dynamic questions', e)
      setDynamicQuestions([])
    }
  }

  // Auto-recover if resuming into dynamic stage without persisted questions
  useEffect(() => {
    const isDynamicStage = STAGES[currentStageIndex]?.id === 'dynamic_questions'
    if (!job || !isDynamicStage) return
    if (dynamicQuestions.length === 0 && !generating && !showReportPreview) {
      void generateDynamicQuestions()
    }
  }, [job, currentStageIndex, dynamicQuestions.length])
  
  async function generateFinalReport() {
    if (!job) return
    
    setGenerationProgress('Generating final report...')

    // Build dynamic Q&A report (store for provenance)
    const dynamicQAReport = dynamicQuestions.map(q => {
      const answer = dynamicAnswers[q.id] || ''
      return `Q: ${q.label}\nA: ${answer}`
    }).join('\n\n')

    await saveJobReport(job.id, 'dynamic_questionnaire', dynamicQAReport)

    // Use the fast NA JSON prompt to produce structured JSON, then format to Markdown
    const allAnswers = {
      greeting_report: job.greeting_report,
      org_report: job.org_report,
      requirement_report: job.requirement_report,
      preliminary_report: job.preliminary_report,
      dynamic_questions: dynamicQuestions,
      dynamic_answers: dynamicAnswers,
      dynamic_qa_text: dynamicQAReport
    }
    const prompt = buildFastNAReportPrompt(experienceLevel || 'Experienced', allAnswers)
    const response = await callLLM([{ role: 'user', content: prompt }])
    let finalMarkdown = ''
    try {
      const jsonStr = tryExtractJson(response.content)
      const parsed = JSON.parse(jsonStr)
      finalMarkdown = formatReportAsMarkdown(parsed)
    } catch (_e) {
      // Fallback: if model didn't return JSON, use its content as-is
      finalMarkdown = response.content
    }

    await saveJobReport(job.id, 'final', finalMarkdown)
    setCurrentReport(finalMarkdown)
    setShowReportPreview(true)
  }
  
  function isStageValid(): boolean {
    const currentStage = STAGES[currentStageIndex]
    
    if (!currentStage.fields) return true
    
    // Check required fields
    return currentStage.fields
      .filter(f => f.required)
      .every(f => {
        const value = stageAnswers[f.id]
        return value !== undefined && value !== '' && value !== null
      })
  }
  
  if (!user) {
    navigate('/auth')
    return null
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
      </div>
    )
  }
  
  const currentStage = STAGES[currentStageIndex]
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[rgb(var(--bg))]/60 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">
              {job?.title || 'Polaris Starmap Generator'}
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => saveProgress(true)}
                disabled={saving}
                className="text-white/80 hover:text-white"
              >
                {saving ? 'Saving...' : 'Save & Exit'}
              </button>
              {job && (
                <span className="text-sm text-white/60">
                  Job ID: {job.id.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="border-b border-white/10 bg-[rgb(var(--bg))]/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${index < currentStageIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStageIndex
                      ? 'bg-secondary-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }
                `}>
                  {index < currentStageIndex ? '✓' : index + 1}
                </div>
                {index < STAGES.length - 1 && (
                  <div className={`
                    w-full h-1 mx-2
                    ${index < currentStageIndex ? 'bg-green-500' : 'bg-white/10'}
                  `} style={{ width: '100px' }} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-white">{currentStage.label}</p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 border border-red-500/30 rounded-lg text-red-100 bg-red-500/15">
            {error}
          </div>
        )}
        
        {generating ? (
          <div className="glass-card rounded-lg p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-white">{generationProgress}</p>
            </div>
          </div>
        ) : showReportPreview ? (
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Report Preview</h2>
            <div className="mb-6">
              <ReportDisplay reportMarkdown={currentReport} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviewContinue}
                className="btn-primary px-6 py-2"
              >
                Continue
              </button>
            </div>
          </div>
        ) : currentStage.fields ? (
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-white">{currentStage.label}</h2>
            
            {/* Experience Level Selection (for first stage) */}
            {currentStageIndex === 0 && !experienceLevel && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-white">Select Your Experience Level</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(EXPERIENCE_LEVELS[0] as any).options?.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setExperienceLevel(option)}
                      className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
                    >
                      <h4 className="font-semibold text-white">{option}</h4>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Stage Fields */}
            {(currentStageIndex > 0 || experienceLevel) && (
              <div className="space-y-6">
                {currentStage.fields.map(field => (
                  <RenderField
                    key={field.id}
                    field={field}
                    value={stageAnswers[field.id]}
                    onChange={(id, value) => setStageAnswers({
                      ...stageAnswers,
                      [id]: value
                    })}
                  />
                ))}
              </div>
            )}
            
            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStageIndex(Math.max(0, currentStageIndex - 1))}
                disabled={currentStageIndex === 0}
                className="px-6 py-2 btn-ghost text-white/90 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleStageComplete}
                disabled={!isStageValid() || (currentStageIndex === 0 && !experienceLevel)}
                className="btn-primary px-6 py-2 disabled:opacity-50"
              >
                {currentStageIndex === STAGES.length - 1 ? 'Complete' : 'Next'}
              </button>
            </div>
          </div>
        ) : currentStage.id === 'dynamic_questions' && dynamicQuestions.length > 0 ? (
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-white">Additional Questions</h2>
            <p className="text-white/70 mb-6">
              Based on your initial inputs, please answer these additional questions to refine the recommendations.
            </p>
            
            <div className="space-y-6">
              {dynamicQuestions.map(field => (
                <RenderField
                  key={field.id}
                  field={field}
                  value={dynamicAnswers[field.id]}
                  onChange={(id, value) => setDynamicAnswers({
                    ...dynamicAnswers,
                    [id]: value
                  })}
                />
              ))}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleStageComplete}
                className="btn-primary px-6 py-2"
              >
                Generate Final Report
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-lg p-12">
            <div className="text-center">
              <p className="text-lg text-white/80">Processing stage...</p>
              {currentStage.id === 'dynamic_questions' && (
                <div className="mt-4">
                  <button
                    onClick={generateDynamicQuestions}
                    className="btn-primary px-6 py-2"
                  >
                    Regenerate Questions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
