import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  createStarmapJob,
  updateStarmapJobStageData,
  saveDynamicQuestions,
  submitStarmapJobForProcessing,
  checkAsyncJobStatus,
  saveSessionState,
  resumeStarmapJob,
  type StarmapJob
} from '@/services/starmapJobsService'
import { callLLM } from '@/services/llmClient'
import RenderField from '@/polaris/needs-analysis/RenderField'
import { EnhancedReportDisplay } from '@/components'
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

import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'
import { 
  StepIndicator, 
  WizardContainer, 
  ActionButtons, 
  ProgressBar 
} from '@/components'

const STEPS = [
  { id: 'experience', label: 'Experience Level', description: 'Tell us about your background' },
  { id: 'stage1', label: 'Your Details', description: 'Basic information about you' },
  { id: 'stage2', label: 'Organization', description: 'About your organization' },
  { id: 'stage3', label: 'Project Scope', description: 'Project requirements and constraints' },
  { id: 'dynamic', label: 'Deep Dive', description: 'Targeted questions based on your inputs' },
  { id: 'report', label: 'Your Starmap', description: 'View and edit your personalized report' }
]

export default function PolarisRevampedV3() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  
  // Job state
  const [job, setJob] = useState<StarmapJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [active, setActive] = useState('experience')
  const [experienceAnswer, setExperienceAnswer] = useState<NAResponseMap>({})
  const [stage1Answers, setStage1Answers] = useState<NAResponseMap>({})
  const [stage2Answers, setStage2Answers] = useState<NAResponseMap>({})
  const [stage3Answers, setStage3Answers] = useState<NAResponseMap>({})
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
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Load or create job on mount
  useEffect(() => {
    initializeJob()
    
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])
  
  // Auto-save on changes
  useEffect(() => {
    if (!job) return
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      saveProgress()
    }, 2000) // Save after 2 seconds of inactivity
  }, [stage1Answers, stage2Answers, stage3Answers, dynamicAnswers])
  
  async function initializeJob() {
    try {
      setLoading(true)
      
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
          restoreJobState(data)
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
  }
  
  function restoreJobState(job: StarmapJob) {
    // Restore experience level
    if (job.experience_level) {
      setExperienceAnswer({ exp_level: job.experience_level })
    }
    
    // Restore stage data
    setStage1Answers(job.stage1_data || {})
    setStage2Answers(job.stage2_data || {})
    setStage3Answers(job.stage3_data || {})
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
      startPolling(job.id)
    }
    
    // Navigate to appropriate step
    if (job.status === 'completed' && job.final_report) {
      setActive('report')
    } else if (job.dynamic_complete) {
      setActive('dynamic')
    } else if (job.stage3_complete) {
      setActive('stage3')
    } else if (job.stage2_complete) {
      setActive('stage2')
    } else if (job.stage1_complete) {
      setActive('stage1')
    } else if (job.experience_level) {
      setActive('stage1')
    }
  }
  
  async function saveProgress() {
    if (!job || saving) return
    
    try {
      setSaving(true)
      const expVal = (experienceAnswer['exp_level'] as string) || ''
      
      // Save current stage data
      if (active === 'stage1' && Object.keys(stage1Answers).length > 0) {
        await updateStarmapJobStageData(job.id, 'stage1', stage1Answers)
      } else if (active === 'stage2' && Object.keys(stage2Answers).length > 0) {
        await updateStarmapJobStageData(job.id, 'stage2', stage2Answers)
      } else if (active === 'stage3' && Object.keys(stage3Answers).length > 0) {
        await updateStarmapJobStageData(job.id, 'stage3', stage3Answers)
      } else if (active === 'dynamic' && Object.keys(dynamicAnswers).length > 0) {
        await updateStarmapJobStageData(job.id, 'dynamic', dynamicAnswers)
      }
      
      // Save session state
      await saveSessionState(job.id, {
        active,
        experienceLevel: expVal,
        asyncJobId,
        asyncStatus,
        lastSaved: new Date().toISOString()
      })
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
      const expVal = (experienceAnswer['exp_level'] as string) || 'Experienced'
      
      const staticAnswers = {
        ...stage1Answers,
        ...stage2Answers,
        ...stage3Answers
      }
      
      const prompt = NA_QUESTIONNAIRE_PROMPT(
        expVal,
        2, // Generate 2 rounds of questions
        staticAnswers,
        dynamicAnswers
      )
      
      const response = await callLLM([{ role: 'user', content: prompt }])
      const jsonStr = tryExtractJson(response.content)
      const parsed = JSON.parse(jsonStr)
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : []
      
      if (questions.length > 0) {
        setDynamicQuestions(questions)
        await saveDynamicQuestions(job.id, questions)
      }
    } catch (err) {
      console.error('Error generating dynamic questions:', err)
      setError('Failed to generate questions. Please try again.')
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }
  
  async function generateReport() {
    if (!job) return
    
    try {
      setGenerating(true)
      setGenerationProgress('Preparing your personalized starmap...')
      const expVal = (experienceAnswer['exp_level'] as string) || 'Experienced'
      
      // Build the comprehensive prompt
      const allData = {
        experience: expVal,
        ...stage1Answers,
        ...stage2Answers,
        ...stage3Answers,
        dynamic_answers: dynamicAnswers
      }
      
      const prompt = buildFastNAReportPrompt(
        expVal,
        allData
      )
      
      // Submit for async processing
      setGenerationProgress('Submitting for processing...')
      const { data: submitData, error: submitError } = await submitStarmapJobForProcessing(
        job.id,
        prompt,
        'sonar-pro',
        'final'
      )
      
      if (submitError || !submitData) {
        throw new Error('Failed to submit job for processing')
      }
      
      setAsyncJobId(submitData.jobId)
      setAsyncStatus('processing')
      setAsyncProgress(0)
      
      // Save async job info
      await saveSessionState(job.id, {
        active: 'report',
        asyncJobId: submitData.jobId,
        asyncStatus: 'processing',
        lastSaved: new Date().toISOString()
      })
      
      // Start polling for status
      startPolling(job.id)
      
      // Show processing UI
      setActive('report')
      setGenerationProgress('Your starmap is being generated. You can safely navigate away and return later.')
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
      } else if (data.status === 'failed') {
        // Job failed
        setError(data.error || 'Report generation failed. Please try again.')
        setGenerating(false)
        setGenerationProgress('')
        
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }
    }, 3000) // Poll every 3 seconds
  }
  
  function getStepIndex(stepId: string): number {
    return STEPS.findIndex(s => s.id === stepId)
  }
  
  function canProceedToNext(): boolean {
    switch (active) {
      case 'experience':
        return EXPERIENCE_LEVELS.every(f => !f.required || !!experienceAnswer[f.id])
      case 'stage1':
        return STAGE1_REQUESTER_FIELDS.every(f => 
          !f.required || stage1Answers[f.id]
        )
      case 'stage2':
        return STAGE2_ORGANIZATION_FIELDS.every(f => 
          !f.required || stage2Answers[f.id]
        )
      case 'stage3':
        return STAGE3_PROJECT_FIELDS.every(f => 
          !f.required || stage3Answers[f.id]
        )
      case 'dynamic':
        return dynamicQuestions.length === 0 || dynamicQuestions.every(f => 
          !f.required || dynamicAnswers[f.id]
        )
      default:
        return true
    }
  }
  
  async function handleNext() {
    if (!canProceedToNext() || !job) return
    
    await saveProgress()
    
    const currentIndex = getStepIndex(active)
    
    if (active === 'stage3' && dynamicQuestions.length === 0) {
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
  
  if (!user) {
    navigate('/auth')
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
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Starmap Discovery</h1>
              {job && (
                <p className="text-sm text-white/60 mt-1">
                  Job ID: {job.id.slice(0, 8)}... 
                  {saving && <span className="ml-2 text-primary-400">Saving...</span>}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/starmaps')}
                className="px-4 py-2 text-white/80 hover:text-white transition-colors"
              >
                View All Starmaps
              </button>
              {job && job.status === 'processing' && (
                <div className="px-4 py-2 bg-primary-500/20 rounded-lg text-primary-300">
                  Processing... {asyncProgress}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Step Indicator */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StepIndicator
          steps={STEPS.map((s) => ({ key: s.id, label: s.label, description: s.description }))}
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
            title="Generating Content" 
            description={generationProgress}
          >
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-400 mx-auto mb-4"></div>
              <p className="text-lg text-white/80">{generationProgress}</p>
            </div>
          </WizardContainer>
        ) : active === 'report' && (asyncStatus === 'processing' || asyncStatus === 'queued' || asyncStatus === 'running') ? (
          <WizardContainer 
            title="Your Starmap is Being Generated" 
            description="You can safely navigate away and return later. We'll save your report when it's ready."
          >
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary-400 to-secondary-400 h-full transition-all duration-500"
                    style={{ width: `${asyncProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-white/60">{asyncProgress}% complete</p>
              </div>
              <p className="text-lg text-white mb-4">
                Your personalized L&D starmap is being crafted with advanced AI
              </p>
              <p className="text-white/70 mb-8">
                This typically takes 1-2 minutes. Feel free to browse other sections or come back later.
              </p>
              <button
                onClick={() => navigate('/starmaps')}
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
              prelimReport={job?.preliminary_report || undefined}
            />
          </div>
        ) : (
          <WizardContainer 
            title={currentStep?.label || ''} 
            description={currentStep?.description || ''}
          >
            {/* Experience Level */}
            {active === 'experience' && (
              <div className="max-w-xl mx-auto">
                {EXPERIENCE_LEVELS.map(field => (
                  <div key={field.id}>
                    <RenderField
                      field={field}
                      value={experienceAnswer[field.id]}
                      onChange={(id, value) => setExperienceAnswer(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Stage 1 */}
            {active === 'stage1' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {STAGE1_REQUESTER_FIELDS.map(field => (
                  <div key={field.id}>
                    <RenderField
                      field={field}
                      value={stage1Answers[field.id]}
                      onChange={(id, value) => setStage1Answers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Stage 2 */}
            {active === 'stage2' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {STAGE2_ORGANIZATION_FIELDS.map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <RenderField
                      field={field}
                      value={stage2Answers[field.id]}
                      onChange={(id, value) => setStage2Answers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Stage 3 */}
            {active === 'stage3' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {STAGE3_PROJECT_FIELDS.map(field => (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <RenderField
                      field={field}
                      value={stage3Answers[field.id]}
                      onChange={(id, value) => setStage3Answers(prev => ({ ...prev, [id]: value }))}
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
            
            {/* Progress */}
            {active === 'stage1' && (
              <ProgressBar
                value={Object.keys(stage1Answers).filter(k => stage1Answers[k]).length}
                max={STAGE1_REQUESTER_FIELDS.length}
                label="Fields completed"
              />
            )}
            {active === 'stage2' && (
              <ProgressBar
                value={Object.keys(stage2Answers).filter(k => stage2Answers[k]).length}
                max={STAGE2_ORGANIZATION_FIELDS.length}
                label="Fields completed"
              />
            )}
            {active === 'stage3' && (
              <ProgressBar
                value={Object.keys(stage3Answers).filter(k => stage3Answers[k]).length}
                max={STAGE3_PROJECT_FIELDS.length}
                label="Fields completed"
              />
            )}
          </WizardContainer>
        )}
      </div>
    </div>
  )
}
