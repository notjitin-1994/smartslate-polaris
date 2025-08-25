import { useRef, useState, useEffect } from 'react'
import { callLLM } from '@/services/llmClient'
import { saveSummary, getUserSummaryCount, SUMMARY_LIMIT, updateSummaryTitle, updateSummaryEditedContent, updateSummaryPrelimReport, updateSummaryFinalContent, updateSummaryReports } from '@/services/polarisSummaryService'
import { researchGreeting, researchOrganization, researchRequirements, perplexityService } from '@/services/perplexityService'
import RenderField from '@/polaris/needs-analysis/RenderField'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { AIReportEditorEnhanced } from '@/components/AIReportEditorEnhanced'
import { SolaraLodestar } from '@/components'
import { EXPERIENCE_LEVELS } from '@/polaris/needs-analysis/experience'
import { STAGE1_REQUESTER_FIELDS, STAGE2_ORGANIZATION_FIELDS, STAGE3_PROJECT_FIELDS } from '@/polaris/needs-analysis/three-stage-static'
import { NA_STAGE_TITLE_PROMPT, NA_QUESTIONNAIRE_PROMPT } from '@/polaris/needs-analysis/prompts'
import { NA_REPORT_PROMPT, type NAReport } from '@/polaris/needs-analysis/report'
import { tryExtractJson } from '@/polaris/needs-analysis/json'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'
import { useAuth } from '@/contexts/AuthContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { env } from '@/config/env'
import { formatErrorMessage } from '@/lib/errors'

export default function PolarisRevamped() {
  const { user } = useAuth()
  const [active, setActive] = useState<'experience' | 'stage1' | 'stage2' | 'stage3' | 'prelim' | 'dynamic' | 'report'>('experience')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryCount, setSummaryCount] = useState<number>(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // State for all responses (persist to localStorage for quicker testing)
  const [experienceAnswer, setExperienceAnswer] = useLocalStorage<NAResponseMap>('polaris_experience', {})
  const [stage1Answers, setStage1Answers] = useLocalStorage<NAResponseMap>('polaris_stage1', {})
  const [stage2Answers, setStage2Answers] = useLocalStorage<NAResponseMap>('polaris_stage2', {})
  const [stage3Answers, setStage3Answers] = useLocalStorage<NAResponseMap>('polaris_stage3', {})
  
  // Research reports
  const [greetingReport, setGreetingReport] = useState<string>('')
  const [orgReport, setOrgReport] = useState<string>('')
  const [requirementReport, setRequirementReport] = useState<string>('')
  // Hold the actual research promises (resolve to strings) and latest resolved values
  const greetingPromiseRef = useRef<Promise<string> | null>(null)
  const orgPromiseRef = useRef<Promise<string> | null>(null)
  const reqPromiseRef = useRef<Promise<string> | null>(null)
  const greetingReportRef = useRef<string>('')
  const orgReportRef = useRef<string>('')
  const requirementReportRef = useRef<string>('')
  
  // Dynamic questions
  const [dynamicStages, setDynamicStages] = useState<Array<{
    title: string
    questions: NAField[]
    answers: NAResponseMap
  }>>([])
  const [currentDynamicStage, setCurrentDynamicStage] = useState(0)
  
  // Final report and editing
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  const [editedContent, setEditedContent] = useState<string>('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [lastSavedSummaryId, setLastSavedSummaryId] = useState<string | null>(null)
  const [reportTitle, setReportTitle] = useState<string>('')
  const [savingTitle, setSavingTitle] = useState<boolean>(false)
  const [savingEdit, setSavingEdit] = useState<boolean>(false)
  // Preliminary report
  const [prelimMarkdown, setPrelimMarkdown] = useState<string>('')
  const [editedPrelim, setEditedPrelim] = useState<string>('')
  const [savingPrelim, setSavingPrelim] = useState<boolean>(false)
  
  // UI state
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const [loader, setLoader] = useState<{ active: boolean; phase?: string; message: string; progress: number; etaSeconds: number }>({ 
    active: false, message: '', progress: 0, etaSeconds: 0 
  })
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Prefill user data from auth context on mount
  useEffect(() => {
    if (user) {
      // Prefill email from auth
      setStage1Answers(prev => ({
        ...prev,
        requester_email: user.email || ''
      }))
      
      // Try to get name from user metadata if available
      const metadata = (user as any).user_metadata
      if (metadata?.full_name) {
        setStage1Answers(prev => ({
          ...prev,
          requester_name: metadata.full_name
        }))
      }
    }
  }, [user])
  
  // Load user's current summary count on mount
  useEffect(() => {
    async function loadSummaryCount() {
      const { count, error } = await getUserSummaryCount()
      if (!error && count !== null) {
        setSummaryCount(count)
      }
    }
    loadSummaryCount()
  }, [])
  
  // Check if stages are complete
  const experienceLevel = experienceAnswer.exp_level as string | undefined
  const hasExperience = !!experienceLevel
  
  const stage1Complete = STAGE1_REQUESTER_FIELDS.filter(f => f.required).every(f => {
    const val = stage1Answers[f.id]
    return val !== undefined && val !== null && val !== ''
  })
  
  const stage2Complete = STAGE2_ORGANIZATION_FIELDS.filter(f => f.required).every(f => {
    const val = stage2Answers[f.id]
    if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
    return val !== undefined && val !== null && val !== ''
  })
  
  const stage3Complete = STAGE3_PROJECT_FIELDS.filter(f => f.required).every(f => {
    const val = stage3Answers[f.id]
    if (f.type === 'calendar_range') {
      const v = (val || {}) as { start?: string; end?: string }
      return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
    }
    return val !== undefined && val !== null && val !== ''
  })
  
  // Helper for smooth loader animation
  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function startSmartLoader(phase: string, baseTimeMs: number = 8000) {
    const targetMs = Math.min(14000, Math.max(5500, baseTimeMs))
    const start = Date.now()
    
    const step = () => {
      const elapsed = Date.now() - start
      const ratio = Math.min(1, elapsed / targetMs)
      const progress = Math.min(95, Math.max(5, Math.round(easeInOutCubic(ratio) * 95)))
      // Human-friendly, technology-agnostic messages per phase
      let message = 'Preparing…'
      if (progress > 15) {
        if (phase === 'prelim-save') message = 'Saving your draft…'
        else if (phase === 'prelim') message = 'Drafting your preliminary plan…'
        else if (String(phase).startsWith('dynamic')) message = 'Preparing follow-up questions…'
        else if (phase === 'report') message = 'Analyzing your inputs…'
        else message = 'Gathering your information…'
      }
      if (progress > 45) message = phase === 'report' ? 'Compiling your tailored plan…' : 'Refining next steps…'
      if (progress > 70) message = 'Finalizing…'
      if (progress > 85) message = 'Wrapping up…'
      const etaSeconds = Math.max(1, Math.ceil((targetMs - elapsed) / 1000))
      setLoader({ active: true, phase, message, progress, etaSeconds })
    }
    
    step()
    if (loaderIntervalRef.current) clearInterval(loaderIntervalRef.current)
    loaderIntervalRef.current = setInterval(step, 180)
  }

  function stopSmartLoader() {
    if (loaderIntervalRef.current) {
      clearInterval(loaderIntervalRef.current)
      loaderIntervalRef.current = null
    }
    setLoader((prev) => ({ ...prev, active: true, progress: 100, message: 'Ready' }))
    window.setTimeout(() => setLoader({ active: false, message: '', progress: 0, etaSeconds: 0 }), 450)
  }

  // Promise timeout helper to avoid indefinite hangs
  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        const err: any = new Error(`${label} timed out after ${ms}ms`)
        err.code = 'TIMEOUT'
        reject(err)
      }, ms)
      promise.then(
        (res) => {
          clearTimeout(id)
          resolve(res)
        },
        (err) => {
          clearTimeout(id)
          reject(err)
        }
      )
    })
  }
  
  // Reset all state
  function resetAll() {
    try {
      if (loaderIntervalRef.current) {
        clearInterval(loaderIntervalRef.current)
        loaderIntervalRef.current = null
      }
    } catch {}

    setLoader({ active: false, message: '', progress: 0, etaSeconds: 0 })
    setExperienceAnswer({})
    setStage1Answers({})
    setStage2Answers({})
    setStage3Answers({})
    setGreetingReport('')
    setOrgReport('')
    setRequirementReport('')
    setDynamicStages([])
    setCurrentDynamicStage(0)
    setReportMarkdown('')
    setEditedContent('')
    setIsEditMode(false)
    setActive('experience')
  }

  // Autofill demo data for faster local testing
  function autofillDemo() {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45)
    const startStr = start.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)

    setExperienceAnswer({ exp_level: 'expert' })

    setStage1Answers({
      requester_name: 'Jane Smith',
      requester_role: 'Head of L&D',
      requester_department: 'Learning & Development',
      requester_email: 'jane.smith@acme.com',
      requester_phone: '+1 555-0123',
      requester_timezone: 'UTC+05:30 (IST)'
    })

    setStage2Answers({
      org_name: 'Acme Corporation',
      org_industry: 'Technology',
      org_size: '1001-5000 employees',
      org_headquarters: 'San Francisco, CA, USA',
      org_website: 'https://www.acme.com',
      org_mission: 'Innovate and deliver world-class solutions that empower businesses globally.',
      org_compliance: ['SOC 2', 'GDPR'],
      org_stakeholders: ['HR Leadership', 'Department Heads', 'C-Suite']
    })

    setStage3Answers({
      project_objectives: 'Reduce onboarding time by 50% and improve sales performance by 15% within 2 quarters.',
      project_constraints: 'Limited budget; distributed workforce across 4 time zones; legacy LMS integration.',
      target_audience: 'New hires and mid-level sales managers with 3-7 years experience; tech-savvy.',
      project_timeline: { start: startStr, end: endStr },
      project_budget_range: '$100,000 - $250,000',
      available_hardware: ['Laptops', 'Smartphones'],
      available_software: ['LMS', 'Microsoft 365', 'Zoom', 'Slack'],
      subject_matter_experts: 'Internal Sales Enablement and Product Marketing',
      additional_context: 'Executive sponsors aligned; preference for blended learning approach.'
    })
  }

  // Support query param ?demo=1 to auto-populate on load
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('demo') === '1') {
      autofillDemo()
    }
  }, [])
  
  // Stage 1 Research (background)
  async function completeStage1() {
    setError(null)
    // Kick off research in the background; do not block UI
    try {
      const researchData = {
        name: stage1Answers.requester_name as string,
        role: stage1Answers.requester_role as string,
        department: stage1Answers.requester_department as string,
        email: stage1Answers.requester_email as string,
        phone: stage1Answers.requester_phone as string | undefined,
        timezone: stage1Answers.requester_timezone as string | undefined
      }
      // If we don't have a summary yet, create a minimal draft now so we can tag each report incrementally
      let createdId: string | null = lastSavedSummaryId
      if (!createdId) {
        const { data: draft, error: draftErr } = await saveSummary({
          company_name: (stage2Answers.org_name as string) || null,
          report_title: null,
          summary_content: '# Draft – Starmap in progress',
          prelim_report: null,
          stage1_answers: { ...experienceAnswer, ...stage1Answers },
          stage2_answers: stage2Answers,
          stage3_answers: stage3Answers,
          stage2_questions: [],
          stage3_questions: [],
          greeting_report: null,
          org_report: null,
          requirement_report: null,
        })
        if (!draftErr && draft?.id) {
          setLastSavedSummaryId(draft.id)
          createdId = draft.id
        }
      }
      // Start research and capture the resolved content directly in a ref to avoid stale React state reads
      greetingPromiseRef.current = researchGreeting(researchData)
      greetingPromiseRef.current
        .then(async (text) => {
          greetingReportRef.current = text
          setGreetingReport(text)
          const sid = createdId || lastSavedSummaryId
          if (sid) {
            await updateSummaryReports(sid, { greeting_report: text })
          }
        })
        .catch(() => setGreetingReport('Research unavailable - continuing with provided information.'))
    } catch {}
    // Move on immediately
    setActive('stage2')
  }
  
  // Stage 2 Research (background)
  async function completeStage2() {
    setError(null)
    try {
      const researchData = {
        orgName: stage2Answers.org_name as string,
        industry: stage2Answers.org_industry as string,
        size: stage2Answers.org_size as string,
        headquarters: stage2Answers.org_headquarters as string,
        website: stage2Answers.org_website as string | undefined,
        mission: stage2Answers.org_mission as string | undefined,
        constraints: stage2Answers.org_compliance as string[] | undefined,
        stakeholders: stage2Answers.org_stakeholders as string[] | undefined
      }
      orgPromiseRef.current = researchOrganization({ ...researchData, requesterRole: stage1Answers.requester_role as string })
      orgPromiseRef.current
        .then(async (text) => {
          orgReportRef.current = text
          setOrgReport(text)
          const sid = lastSavedSummaryId
          if (sid) {
            await updateSummaryReports(sid, { org_report: text })
          }
        })
        .catch(() => setOrgReport('Research unavailable - continuing with provided information.'))
    } catch {}
    setActive('stage3')
  }
  
  // Stage 3 Research (background) then generate questions
  async function completeStage3() {
    setError(null)
    try {
      const timeline = stage3Answers.project_timeline as { start?: string; end?: string }
      const researchData = {
        objectives: stage3Answers.project_objectives as string,
        constraints: stage3Answers.project_constraints as string,
        audience: stage3Answers.target_audience as string,
        timeline: `${timeline?.start || 'TBD'} to ${timeline?.end || 'TBD'}`,
        budget: stage3Answers.project_budget_range as string,
        hardware: stage3Answers.available_hardware as string[] | undefined,
        software: stage3Answers.available_software as string[] | undefined,
        experts: stage3Answers.subject_matter_experts ? [stage3Answers.subject_matter_experts as string] : undefined,
        other: stage3Answers.additional_context as string | undefined
      }
      reqPromiseRef.current = researchRequirements(researchData)
      reqPromiseRef.current
        .then(async (text) => {
          requirementReportRef.current = text
          setRequirementReport(text)
          const sid = lastSavedSummaryId
          if (sid) {
            await updateSummaryReports(sid, { requirement_report: text })
          }
        })
        .catch(() => setRequirementReport('Research unavailable - continuing with provided information.'))
    } catch {}
    // Proceed to preliminary master report; we'll wait briefly for research to finish.
    await generatePrelimReport()
  }
  
  // Generate preliminary master report from research inputs
  async function generatePrelimReport() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('prelim', 12000)
      console.groupCollapsed('[Polaris] Preliminary report')
      console.time('[Polaris] prelim:total')

      // Ensure research has a short window to complete before we proceed
      // Wait for the actual research promises (which resolve to strings). Store latest results in refs to avoid stale state.
      const pending: Array<Promise<string>> = []
      const keys: Array<'greet' | 'org' | 'req'> = []
      if (greetingPromiseRef.current) { pending.push(greetingPromiseRef.current); keys.push('greet') }
      if (orgPromiseRef.current) { pending.push(orgPromiseRef.current); keys.push('org') }
      if (reqPromiseRef.current) { pending.push(reqPromiseRef.current); keys.push('req') }
      let settled: any = null
      if (pending.length) {
        settled = await Promise.race([
          Promise.allSettled(pending),
          new Promise(resolve => setTimeout(resolve, 7000)),
        ])
        if (Array.isArray(settled)) {
          settled.forEach((res, i) => {
            if (res && res.status === 'fulfilled' && typeof res.value === 'string') {
              const k = keys[i]
              if (k === 'greet') greetingReportRef.current = res.value
              else if (k === 'org') orgReportRef.current = res.value
              else if (k === 'req') requirementReportRef.current = res.value
            }
          })
        }
      }

      // Use resolved refs first, then React state, then safe placeholders
      const safe = (s?: string) => (s && s.trim().length > 0 ? s : '')
      let greetingText = safe(greetingReportRef.current) || safe(greetingReport)
      let orgText = safe(orgReportRef.current) || safe(orgReport)
      let reqText = safe(requirementReportRef.current) || safe(requirementReport)

      if (!greetingText) greetingText = 'Research unavailable. Proceed with requester details and stated objectives.'
      if (!orgText) orgText = 'Organization research unavailable. Proceed with Stage 2 organization inputs.'
      if (!reqText) reqText = 'Requirements research unavailable. Proceed with Stage 3 scoping inputs.'

      // Build concise summaries from stage answers to ensure the LLM has concrete facts
      const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
      const timeline = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
      const stage1Summary = `Requester: ${fmt(stage1Answers.requester_name)} (${fmt(stage1Answers.requester_role)} – ${fmt(stage1Answers.requester_department)})\nEmail: ${fmt(stage1Answers.requester_email)}\nPhone: ${fmt(stage1Answers.requester_phone)}\nTime Zone: ${fmt(stage1Answers.requester_timezone)}`
      const stage2Summary = `Organization: ${fmt(stage2Answers.org_name)}\nIndustry: ${fmt(stage2Answers.org_industry)}\nSize: ${fmt(stage2Answers.org_size)}\nHeadquarters: ${fmt(stage2Answers.org_headquarters)}\nWebsite: ${fmt(stage2Answers.org_website)}\nMission: ${fmt(stage2Answers.org_mission)}\nCompliance: ${fmt(stage2Answers.org_compliance)}\nStakeholders: ${fmt(stage2Answers.org_stakeholders)}`
      const stage3Summary = `Objectives: ${fmt(stage3Answers.project_objectives)}\nConstraints: ${fmt(stage3Answers.project_constraints)}\nAudience: ${fmt(stage3Answers.target_audience)}\nTimeline: ${(timeline.start || 'TBD')} to ${(timeline.end || 'TBD')}\nBudget: ${fmt(stage3Answers.project_budget_range)}\nHardware: ${fmt(stage3Answers.available_hardware)}\nSoftware: ${fmt(stage3Answers.available_software)}\nSMEs: ${fmt(stage3Answers.subject_matter_experts)}\nOther: ${fmt(stage3Answers.additional_context)}`

      const prelimPrompt = `You are an expert L&D consultant. Produce a Preliminary Master Report in MARKDOWN that our viewer can parse. FOLLOW THESE RULES EXACTLY:

TOP-LEVEL HEADINGS (use these exact strings, with two leading hashes):
## Executive Summary
## Recommended Solution
## Delivery Plan
## Measurement
## Budget
## Risk Mitigation
## Next Steps

FORMATTING REQUIREMENTS:
- Under Executive Summary, include lines and lists in this exact pattern:
  **Problem Statement:** <one sentence>
  **Current State:**\n- <bullet>\n- <bullet>
  **Root Causes:**\n- <bullet>\n- <bullet>
  **Objectives:**\n- <bullet>\n- <bullet>
- Under Recommended Solution:
  ### Delivery Modalities\n- **<Modality Name>:** <reason>
  **Target Audiences:**\n- <bullet>
  **Key Competencies:**\n- <bullet>
  **Content Outline:**\n- <bullet>
- Under Delivery Plan:
  **<Phase Name>** (<number> weeks)\nGoals:\n- <bullet>\nActivities:\n- <bullet>
  ### Timeline\n- **<Label>:** yyyy-mm-dd to yyyy-mm-dd
  ### Resources\n- <role>
- Under Measurement:
  **Success Metrics:**\n- <bullet>
  **Assessment Strategy:**\n- <bullet>
  **Data Sources:**\n- <bullet>
- Under Budget:
  Notes: <one sentence>
  - **<Item>:** <low> - <high>
- Under Risk Mitigation:
  - **Risk:** <text>\n  **Mitigation:** <text>
- Under Next Steps:
  1. <short step>\n  2. <short step>

Use the inputs below. Be specific and concise. If research is thin, use the stage answers directly.

---
GREETING REPORT:\n${greetingText}

ORGANIZATION REPORT:\n${orgText}

REQUIREMENTS REPORT:\n${reqText}

---
STAGE ANSWERS SUMMARY (authoritative user-provided data):
STAGE 1 – REQUESTER & ORG CONTACTS:\n${stage1Summary}

STAGE 2 – ORGANIZATION DETAILS:\n${stage2Summary}

STAGE 3 – PROJECT SCOPING:\n${stage3Summary}
`

      // Generate prelim with Sonar Reasoning via Perplexity
      const reasoningModel = (env as any).perplexityPrelimModel || 'sonar reasoning'
      const prelimRes = await withTimeout(
        perplexityService.research(prelimPrompt, { model: reasoningModel, temperature: 0.2, maxTokens: 2600 }),
        60000,
        'Preliminary report generation'
      )
      let prelim = (prelimRes.content || '').trim()
      // Ensure viewer-compatible markdown if model returns a plain summary
      const hasExecutive = /(^|\n)##\s+Executive Summary/.test(prelim)
      if (!hasExecutive) {
        const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
        const tl = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
        const objectives = fmt(stage3Answers.project_objectives) || 'Objectives to be finalized.'
        const audience = fmt(stage3Answers.target_audience) || 'Primary learners'
        const budget = fmt(stage3Answers.project_budget_range) || 'TBD'
        const tlStart = tl.start || 'TBD'
        const tlEnd = tl.end || 'TBD'
        prelim = `## Executive Summary
**Problem Statement:** ${objectives}

**Current State:**
- Based on organization details and research above

**Root Causes:**
- To be validated with stakeholders

**Objectives:**
- ${objectives}

## Recommended Solution
### Delivery Modalities
- **Blended Learning:** Balance flexibility and impact

**Target Audiences:**
- ${audience}

**Key Competencies:**
- Align to business goals

**Content Outline:**
- High-level modules derived from requirements

## Delivery Plan
**Discovery & Alignment** (2 weeks)
Goals:
- Confirm scope and constraints
Activities:
- Stakeholder workshops

### Timeline
- **Project Window:** ${tlStart} to ${tlEnd}

### Resources
- Core project team

## Measurement
**Success Metrics:**
- Baseline and target metrics TBD

**Assessment Strategy:**
- Formative and summative checks

**Data Sources:**
- LMS and operational systems

## Budget
Notes: ${budget}
- **Development:** TBD - TBD

## Risk Mitigation
- **Risk:** Incomplete inputs
  **Mitigation:** Schedule follow-ups to fill gaps

## Next Steps
1. Validate requirements with stakeholders
2. Confirm scope, timeline, and constraints`
      }
      setPrelimMarkdown(prelim)
      setEditedPrelim(prelim)
      setActive('prelim')
    } catch (e: any) {
      console.error('[Polaris] Preliminary report failed', e)
      setError(formatErrorMessage(e) || 'Failed to generate preliminary report.')
      // If prelim fails, continue to dynamic generation anyway
      await generateDynamicQuestions()
    } finally {
      setLoading(false)
      stopSmartLoader()
      console.timeEnd('[Polaris] prelim:total')
      console.groupEnd()
    }
  }

  // Generate dynamic questions based on research
  async function generateDynamicQuestions() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('dynamic-generation', 15000)
      console.groupCollapsed('[Polaris] Dynamic questions')
      console.time('[Polaris] dynamic:total')
      
      // Ensure research has a short window to complete before we proceed
      const toWait: Promise<any>[] = []
      if (greetingPromiseRef.current) toWait.push(greetingPromiseRef.current)
      if (orgPromiseRef.current) toWait.push(orgPromiseRef.current)
      if (reqPromiseRef.current) toWait.push(reqPromiseRef.current)
      if (toWait.length) {
        await Promise.race([
          Promise.allSettled(toWait),
          new Promise(resolve => setTimeout(resolve, 7000)),
        ])
      }

      // Build context for dynamic questions
      const researchContext = editedPrelim
        ? `PRELIMINARY MASTER REPORT (user-reviewed):\n${editedPrelim}\n\n(Original research inputs below for reference)\n\nGREETING REPORT:\n${greetingReport}\n\nORGANIZATION REPORT:\n${orgReport}\n\nREQUIREMENTS REPORT:\n${requirementReport}\n`
        : `RESEARCH REPORTS:\n\nGREETING REPORT:\n${greetingReport}\n\nORGANIZATION REPORT:\n${orgReport}\n\nREQUIREMENTS REPORT:\n${requirementReport}\n`
      
      // Generate 2-4 dynamic stages based on complexity
      const numStages = Math.min(4, Math.max(2, Math.ceil(Object.keys({...stage1Answers, ...stage2Answers, ...stage3Answers}).length / 10)))
      const stages: typeof dynamicStages = []
      
      for (let i = 0; i < numStages; i++) {
        const stageNum = i + 2 // Dynamic stages start at 2
        
        // Collect all previous answers
        const allPreviousAnswers = {
          ...stage1Answers,
          ...stage2Answers,
          ...stage3Answers,
          ...stages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})
        }
        
        // Generate title
        const titlePrompt = `${NA_STAGE_TITLE_PROMPT(experienceLevel!, stageNum as any, allPreviousAnswers)}
        
RESEARCH CONTEXT:
${researchContext}`
        
        const titleRes = await withTimeout(
          callLLM([{ role: 'user', content: titlePrompt }]),
          30000,
          `Dynamic stage ${stageNum} title`
        )
        const stageTitle = titleRes.content.trim()
        
        // Generate questions
        const questionsPrompt = `${NA_QUESTIONNAIRE_PROMPT(experienceLevel!, stageNum as any, 
          { ...stage1Answers, ...stage2Answers, ...stage3Answers }, 
          stages.reduce((acc, s) => ({ ...acc, ...s.answers }), {}))}
        
RESEARCH CONTEXT FOR INFORMED QUESTIONS:
${researchContext}

Create questions that leverage the research insights to ask more targeted, relevant questions.`
        
        const res = await withTimeout(
          callLLM([{ role: 'user', content: questionsPrompt }]),
          45000,
          `Dynamic stage ${stageNum} questions`
        )
        const json = JSON.parse(tryExtractJson(res.content))
        
        stages.push({
          title: json.title || stageTitle,
          questions: json.questions || [],
          answers: {}
        })
      }
      
      setDynamicStages(stages)
      setActive('dynamic')
    } catch (e: any) {
      console.error('[Polaris] Dynamic questions failed', e)
      setError(formatErrorMessage(e) || 'Failed to generate additional questions.')
      // Skip dynamic stages and go straight to report
      await generateReport()
    } finally {
      setLoading(false)
      stopSmartLoader()
      console.timeEnd('[Polaris] dynamic:total')
      console.groupEnd()
    }
  }

  // Confirm preliminary report: save and proceed to dynamic stages
  async function confirmPrelimAndProceed() {
    console.groupCollapsed('[Polaris] Confirm & Continue (prelim)')
    console.time('[Polaris] confirm:total')
    startSmartLoader('prelim-save', 7000)
    try {
      setSavingPrelim(true)
      // Save prelim to DB (create or update)
      if (!lastSavedSummaryId) {
        const { data: saved, error: saveError } = await saveSummary({
          company_name: (stage2Answers.org_name as string) || null,
          report_title: null,
          summary_content: '# Draft – Starmap in progress',
          prelim_report: editedPrelim,
          stage1_answers: { ...experienceAnswer, ...stage1Answers },
          stage2_answers: stage2Answers,
          stage3_answers: stage3Answers,
          stage2_questions: [],
          stage3_questions: [],
          greeting_report: greetingReport,
          org_report: orgReport,
          requirement_report: requirementReport,
          dynamic_questionnaire_report: null,
        })
        if (saveError) {
          console.error('[Polaris] Prelim save failed', saveError)
          throw saveError
        }
        setLastSavedSummaryId(saved?.id || null)
        setReportTitle((stage2Answers.org_name as string) || '')
      } else {
        const { error } = await updateSummaryPrelimReport(lastSavedSummaryId, editedPrelim)
        if (error) {
          console.error('[Polaris] Prelim update failed', error)
          throw error
        }
      }

      // Clear saving state before long generation so the button doesn't appear stuck
      setSavingPrelim(false)
      stopSmartLoader()

      // Proceed to dynamic stages (which will leverage editedPrelim)
      await generateDynamicQuestions()
    } catch (err: any) {
      console.error('[Polaris] Confirm & Continue failed', err)
      setError(formatErrorMessage(err) || 'Failed to save preliminary report.')
      stopSmartLoader()
    } finally {
      setSavingPrelim(false)
      console.timeEnd('[Polaris] confirm:total')
      console.groupEnd()
    }
  }
  
  // Handle dynamic stage progression
  async function nextDynamicStage() {
    if (currentDynamicStage < dynamicStages.length - 1) {
      setCurrentDynamicStage(prev => prev + 1)
    } else {
      await generateReport()
    }
  }
  
  // Generate final report
  async function generateReport() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('report', 20000)
      console.groupCollapsed('[Polaris] Final report')
      console.time('[Polaris] report:total')
      
      const allAnswers = {
        experience: experienceAnswer,
        stage1: stage1Answers,
        stage2: stage2Answers,
        stage3: stage3Answers,
        ...dynamicStages.reduce((acc, stage, idx) => ({
          ...acc,
          [`dynamic_stage_${idx + 1}`]: stage.answers
        }), {})
      }
      
      // Summaries to ensure concrete facts are present regardless of research availability
      const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
      const tl = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
      const stage1Summary = `Requester: ${fmt(stage1Answers.requester_name)} (${fmt(stage1Answers.requester_role)} – ${fmt(stage1Answers.requester_department)})\nEmail: ${fmt(stage1Answers.requester_email)}\nPhone: ${fmt(stage1Answers.requester_phone)}\nTime Zone: ${fmt(stage1Answers.requester_timezone)}`
      const stage2Summary = `Organization: ${fmt(stage2Answers.org_name)}\nIndustry: ${fmt(stage2Answers.org_industry)}\nSize: ${fmt(stage2Answers.org_size)}\nHeadquarters: ${fmt(stage2Answers.org_headquarters)}\nWebsite: ${fmt(stage2Answers.org_website)}\nMission: ${fmt(stage2Answers.org_mission)}\nCompliance: ${fmt(stage2Answers.org_compliance)}\nStakeholders: ${fmt(stage2Answers.org_stakeholders)}`
      const stage3Summary = `Objectives: ${fmt(stage3Answers.project_objectives)}\nConstraints: ${fmt(stage3Answers.project_constraints)}\nAudience: ${fmt(stage3Answers.target_audience)}\nTimeline: ${(tl.start || 'TBD')} to ${(tl.end || 'TBD')}\nBudget: ${fmt(stage3Answers.project_budget_range)}\nHardware: ${fmt(stage3Answers.available_hardware)}\nSoftware: ${fmt(stage3Answers.available_software)}\nSMEs: ${fmt(stage3Answers.subject_matter_experts)}\nOther: ${fmt(stage3Answers.additional_context)}`

      // Build dynamic questionnaire report (Q&A transcript)
      const dynamicQuestionnaireReport = dynamicStages
        .map((stage, idx) => {
          const qa = stage.questions
            .map(q => {
              const val = (stage.answers as any)[q.id]
              const answer = Array.isArray(val)
                ? val.filter(Boolean).join(', ')
                : typeof val === 'object' && val !== null
                ? JSON.stringify(val)
                : (val ?? '')
              return `- ${q.label}: ${String(answer)}`
            })
            .join('\n')
          return `### Dynamic Stage ${idx + 1}: ${stage.title || 'Additional Questions'}\n${qa}`
        })
        .join('\n\n')

      // Include prelim, dynamic Q&A, research, and stage answers in final generation
      const enhancedPrompt = `${NA_REPORT_PROMPT(experienceLevel!, allAnswers)}

PRELIMINARY MASTER REPORT (user-confirmed):
${editedPrelim || prelimMarkdown}

DYNAMIC QUESTIONNAIRE REPORT (user answers to follow-up questions):
${dynamicQuestionnaireReport}

ADDITIONAL RESEARCH INSIGHTS:

GREETING/CONTEXT:
${greetingReport}

ORGANIZATION ANALYSIS:
${orgReport}

REQUIREMENTS RESEARCH:
${requirementReport}

STAGE ANSWERS SUMMARY (authoritative user-provided data):
STAGE 1 – REQUESTER & ORG CONTACTS:
${stage1Summary}

STAGE 2 – ORGANIZATION DETAILS:
${stage2Summary}

STAGE 3 – PROJECT SCOPING:
${stage3Summary}

Use these to produce the final Starmap. Ensure it resolves open questions using dynamic-stage answers above where possible.`

      // Strong system instruction for Claude (Anthropic). We explicitly target Anthropic with fallback to OpenAI.
      const systemPrompt = `You are an expert Learning Experience Designer and Instructional Designer with decades of hands-on industry experience. You have deep knowledge of past, current, and emerging learning technologies, and you apply principles from cognitive psychology, human factors, and behavior change. Produce pragmatic, decision-ready L&D deliverables that align with business outcomes and constraints.`

      // Create final report with Sonar Reasoning via Perplexity
      const finalModel = (env as any).perplexityFinalModel || 'sonar reasoning'
      const res = await withTimeout(
        perplexityService.research(`${systemPrompt}\n\n${enhancedPrompt}`, { model: finalModel, temperature: 0.2, maxTokens: 4000 }),
        90000,
        'Final report generation'
      )
      
      let reportJson: NAReport
      try {
        const extractedJson = tryExtractJson(res.content)
        reportJson = JSON.parse(extractedJson) as NAReport
        
        // Validate report structure
        if (!reportJson || typeof reportJson !== 'object' || !reportJson.summary?.problem_statement) {
          throw new Error('Invalid report structure')
        }
      } catch (parseError: any) {
        console.error('Failed to parse report JSON:', parseError)
        // Create fallback report
        reportJson = createFallbackReport()
      }
      
      const baseMarkdown = formatReportAsMarkdown(reportJson)
      const markdown = `${baseMarkdown}\n\n## Appendix – Discovery Q&A\n${dynamicQuestionnaireReport || '_No additional Q&A_'}\n`
      setReportMarkdown(markdown)
      setEditedContent(markdown)
      
      // Save final report: update existing summary if present; otherwise create
      try {
        if (lastSavedSummaryId) {
          const { error } = await updateSummaryFinalContent(
            lastSavedSummaryId,
            markdown,
            {
              stage2_questions: dynamicStages.slice(0, Math.ceil(dynamicStages.length / 2)).flatMap(s => s.questions),
              stage3_questions: dynamicStages.slice(Math.ceil(dynamicStages.length / 2)).flatMap(s => s.questions),
              stage3_answers_merge: {
                ...stage3Answers,
                ...dynamicStages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})
              },
              dynamic_questionnaire_report: dynamicQuestionnaireReport || null,
            }
          )
          if (error) {
            console.error('Failed to update final content:', error)
          }
        } else {
          const { data: saved, error: saveError } = await saveSummary({
            company_name: stage2Answers.org_name as string || null,
            report_title: null,
            summary_content: markdown,
            prelim_report: editedPrelim || prelimMarkdown || null,
            stage1_answers: { ...experienceAnswer, ...stage1Answers },
            stage2_answers: stage2Answers,
            stage3_answers: { 
              ...stage3Answers, 
              ...dynamicStages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})
            },
            stage2_questions: dynamicStages.slice(0, Math.ceil(dynamicStages.length / 2))
              .flatMap(s => s.questions),
            stage3_questions: dynamicStages.slice(Math.ceil(dynamicStages.length / 2))
              .flatMap(s => s.questions),
            greeting_report: greetingReport,
            org_report: orgReport,
            requirement_report: requirementReport,
            dynamic_questionnaire_report: dynamicQuestionnaireReport || null,
          })
          if (saveError) {
            console.error('Failed to save summary:', saveError)
            const msg = (saveError?.message || '').toLowerCase()
            if (msg.includes('reached the saved') || msg.includes('reached the creation') || msg.includes('reached the limit')) {
              setShowUpgradeModal(true)
            }
          } else {
            setSummaryCount(prev => prev + 1)
            setLastSavedSummaryId(saved?.id || null)
            setReportTitle((stage2Answers.org_name as string) || '')
          }
        }
      } catch (saveErr) {
        console.error('Error saving summary:', saveErr)
      }
      
      setActive('report')
    } catch (e: any) {
      console.error('[Polaris] Final report failed', e)
      setError(formatErrorMessage(e) || 'Failed to generate report.')
    } finally {
      setLoading(false)
      stopSmartLoader()
      console.timeEnd('[Polaris] report:total')
      console.groupEnd()
    }
  }
  
  // Create fallback report if parsing fails
  function createFallbackReport(): NAReport {
    return {
      summary: {
        problem_statement: 'Analysis in progress',
        current_state: ['Current state assessment pending'],
        root_causes: ['Root cause analysis required'],
        objectives: ['Define clear objectives']
      },
      solution: {
        modalities: [{ name: 'Blended Learning', reason: 'Flexible approach' }],
        scope: {
          audiences: ['Target audience'],
          competencies: ['Core competencies'],
          content_outline: ['Module structure']
        }
      },
      learner_analysis: {
        profile: {
          demographics: ['Demographic analysis'],
          tech_readiness: 'Assessment needed',
          learning_style_fit: ['Learning preferences']
        },
        engagement_strategy: {
          motivation_drivers: ['Motivation factors'],
          potential_barriers: ['Potential challenges'],
          support_mechanisms: ['Support systems']
        },
        design_implications: {
          content_adaptations: ['Content adjustments'],
          delivery_adjustments: ['Delivery modifications'],
          accessibility_requirements: ['Accessibility needs'],
          language_considerations: ['Language requirements']
        }
      },
      technology_talent: {
        tech_enablers: {
          available: ['Existing technology'],
          required: ['Required technology'],
          integration_needs: ['Integration requirements']
        },
        talent_requirements: {
          internal_roles: ['Internal resources'],
          external_support: ['External support'],
          development_needs: ['Development requirements']
        },
        limitations_impact: {
          tech_constraints: ['Technology limitations'],
          talent_gaps_impact: ['Resource gaps'],
          mitigation_strategies: ['Mitigation approaches']
        }
      },
      delivery_plan: {
        phases: [
          {
            name: 'Discovery',
            duration_weeks: 2,
            goals: ['Requirements gathering'],
            activities: ['Stakeholder interviews']
          }
        ],
        timeline: [{ label: 'Phase 1', start: '2025-01-01', end: '2025-02-01' }],
        resources: ['Project team']
      },
      measurement: {
        success_metrics: ['Success indicators'],
        assessment_strategy: ['Assessment methods'],
        data_sources: ['Data collection']
      },
      budget: {
        notes: 'Budget analysis required',
        ranges: [{ item: 'Development', low: 'TBD', high: 'TBD' }]
      },
      risks: [{ risk: 'Implementation risk', mitigation: 'Risk mitigation strategy' }],
      next_steps: ['Review requirements', 'Finalize approach']
    }
  }
  
  // Format report as markdown
  function formatReportAsMarkdown(report: NAReport): string {
    let md = '# Learning & Development Starmap Report\n\n'
    
    // Executive Summary
    if (report.summary) {
      md += '## Executive Summary\n\n'
      if (report.summary.problem_statement) {
        md += `**Problem Statement:** ${report.summary.problem_statement}\n\n`
      }
      if (report.summary.current_state?.length) {
        md += '**Current State:**\n'
        report.summary.current_state.forEach(item => md += `- ${item}\n`)
      }
      if (report.summary.root_causes?.length) {
        md += '\n**Root Causes:**\n'
        report.summary.root_causes.forEach(item => md += `- ${item}\n`)
      }
      if (report.summary.objectives?.length) {
        md += '\n**Objectives:**\n'
        report.summary.objectives.forEach(item => md += `- ${item}\n`)
      }
    }
    
    // Solution Recommendations
    if (report.solution) {
      md += '\n## Recommended Solution\n\n'
      if (report.solution.modalities?.length) {
        md += '### Delivery Modalities\n'
        report.solution.modalities.forEach(m => {
          if (m?.name && m?.reason) {
            md += `- **${m.name}:** ${m.reason}\n`
          }
        })
      }
      if (report.solution.scope) {
        md += '\n### Scope\n'
        if (report.solution.scope.audiences?.length) {
          md += '**Target Audiences:**\n'
          report.solution.scope.audiences.forEach(a => md += `- ${a}\n`)
        }
        if (report.solution.scope.competencies?.length) {
          md += '\n**Key Competencies:**\n'
          report.solution.scope.competencies.forEach(c => md += `- ${c}\n`)
        }
        if (report.solution.scope.content_outline?.length) {
          md += '\n**Content Outline:**\n'
          report.solution.scope.content_outline.forEach(c => md += `- ${c}\n`)
        }
      }
    }
    
    // Learner Analysis - similar to existing implementation
    if (report.learner_analysis) {
      md += '\n## Learner Analysis\n\n'
      
      if (report.learner_analysis.profile) {
        md += '### Learner Profile\n'
        if (report.learner_analysis.profile.demographics?.length) {
          md += '**Demographics:**\n'
          report.learner_analysis.profile.demographics.forEach(d => md += `- ${d}\n`)
        }
        if (report.learner_analysis.profile.tech_readiness) {
          md += `\n**Technology Readiness:** ${report.learner_analysis.profile.tech_readiness}\n`
        }
        if (report.learner_analysis.profile.learning_style_fit?.length) {
          md += '\n**Learning Style Preferences:**\n'
          report.learner_analysis.profile.learning_style_fit.forEach(l => md += `- ${l}\n`)
        }
      }
      
      if (report.learner_analysis.engagement_strategy) {
        md += '\n### Engagement Strategy\n'
        if (report.learner_analysis.engagement_strategy.motivation_drivers?.length) {
          md += '**Motivation Drivers:**\n'
          report.learner_analysis.engagement_strategy.motivation_drivers.forEach(m => md += `- ${m}\n`)
        }
        if (report.learner_analysis.engagement_strategy.potential_barriers?.length) {
          md += '\n**Potential Barriers:**\n'
          report.learner_analysis.engagement_strategy.potential_barriers.forEach(b => md += `- ${b}\n`)
        }
        if (report.learner_analysis.engagement_strategy.support_mechanisms?.length) {
          md += '\n**Support Mechanisms:**\n'
          report.learner_analysis.engagement_strategy.support_mechanisms.forEach(s => md += `- ${s}\n`)
        }
      }
      
      if (report.learner_analysis.design_implications) {
        md += '\n### Design Implications\n'
        if (report.learner_analysis.design_implications.content_adaptations?.length) {
          md += '**Content Adaptations:**\n'
          report.learner_analysis.design_implications.content_adaptations.forEach(c => md += `- ${c}\n`)
        }
        if (report.learner_analysis.design_implications.delivery_adjustments?.length) {
          md += '\n**Delivery Adjustments:**\n'
          report.learner_analysis.design_implications.delivery_adjustments.forEach(d => md += `- ${d}\n`)
        }
        if (report.learner_analysis.design_implications.accessibility_requirements?.length) {
          md += '\n**Accessibility Requirements:**\n'
          report.learner_analysis.design_implications.accessibility_requirements.forEach(a => md += `- ${a}\n`)
        }
        if (report.learner_analysis.design_implications.language_considerations?.length) {
          md += '\n**Language Considerations:**\n'
          report.learner_analysis.design_implications.language_considerations.forEach(l => md += `- ${l}\n`)
        }
      }
    }
    
    // Technology & Talent
    if (report.technology_talent) {
      md += '\n## Technology & Talent Analysis\n\n'
      
      if (report.technology_talent.tech_enablers) {
        md += '### Technology Enablers\n'
        if (report.technology_talent.tech_enablers.available?.length) {
          md += '**Available Technologies:**\n'
          report.technology_talent.tech_enablers.available.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.tech_enablers.required?.length) {
          md += '\n**Required Technologies:**\n'
          report.technology_talent.tech_enablers.required.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.tech_enablers.integration_needs?.length) {
          md += '\n**Integration Requirements:**\n'
          report.technology_talent.tech_enablers.integration_needs.forEach(i => md += `- ${i}\n`)
        }
      }
      
      if (report.technology_talent.talent_requirements) {
        md += '\n### Talent Requirements\n'
        if (report.technology_talent.talent_requirements.internal_roles?.length) {
          md += '**Internal Roles Needed:**\n'
          report.technology_talent.talent_requirements.internal_roles.forEach(r => md += `- ${r}\n`)
        }
        if (report.technology_talent.talent_requirements.external_support?.length) {
          md += '\n**External Support Required:**\n'
          report.technology_talent.talent_requirements.external_support.forEach(e => md += `- ${e}\n`)
        }
        if (report.technology_talent.talent_requirements.development_needs?.length) {
          md += '\n**Skills Development Needs:**\n'
          report.technology_talent.talent_requirements.development_needs.forEach(d => md += `- ${d}\n`)
        }
      }
      
      if (report.technology_talent.limitations_impact) {
        md += '\n### Limitations & Mitigation\n'
        if (report.technology_talent.limitations_impact.tech_constraints?.length) {
          md += '**Technology Constraints:**\n'
          report.technology_talent.limitations_impact.tech_constraints.forEach(c => md += `- ${c}\n`)
        }
        if (report.technology_talent.limitations_impact.talent_gaps_impact?.length) {
          md += '\n**Talent Gaps Impact:**\n'
          report.technology_talent.limitations_impact.talent_gaps_impact.forEach(g => md += `- ${g}\n`)
        }
        if (report.technology_talent.limitations_impact.mitigation_strategies?.length) {
          md += '\n**Mitigation Strategies:**\n'
          report.technology_talent.limitations_impact.mitigation_strategies.forEach(m => md += `- ${m}\n`)
        }
      }
    }
    
    // Delivery Plan
    if (report.delivery_plan) {
      md += '\n## Delivery Plan\n\n'
      if (report.delivery_plan.phases?.length) {
        md += '### Phases\n'
        report.delivery_plan.phases.forEach(p => {
          if (p?.name && p?.duration_weeks) {
            md += `\n**${p.name}** (${p.duration_weeks} weeks)\n`
            if (p.goals?.length) {
              md += 'Goals:\n'
              p.goals.forEach(g => md += `- ${g}\n`)
            }
            if (p.activities?.length) {
              md += 'Activities:\n'
              p.activities.forEach(a => md += `- ${a}\n`)
            }
          }
        })
      }
      
      if (report.delivery_plan.timeline?.length) {
        md += '\n### Timeline\n'
        report.delivery_plan.timeline.forEach(t => {
          if (t?.label && t?.start && t?.end) {
            md += `- **${t.label}:** ${t.start} to ${t.end}\n`
          }
        })
      }
      
      if (report.delivery_plan.resources?.length) {
        md += '\n### Resources Needed\n'
        report.delivery_plan.resources.forEach(r => md += `- ${r}\n`)
      }
    }
    
    // Measurement
    if (report.measurement) {
      md += '\n## Measurement & Success\n\n'
      if (report.measurement.success_metrics?.length) {
        md += '**Success Metrics:**\n'
        report.measurement.success_metrics.forEach(m => md += `- ${m}\n`)
      }
      if (report.measurement.assessment_strategy?.length) {
        md += '\n**Assessment Strategy:**\n'
        report.measurement.assessment_strategy.forEach(a => md += `- ${a}\n`)
      }
      if (report.measurement.data_sources?.length) {
        md += '\n**Data Sources:**\n'
        report.measurement.data_sources.forEach(d => md += `- ${d}\n`)
      }
    }
    
    // Budget
    if (report.budget) {
      md += '\n## Budget Considerations\n\n'
      if (report.budget.notes) {
        md += `${report.budget.notes}\n\n`
      }
      if (report.budget.ranges?.length) {
        report.budget.ranges.forEach(r => {
          if (r?.item && r?.low && r?.high) {
            md += `- **${r.item}:** ${r.low} - ${r.high}\n`
          }
        })
      }
    }
    
    // Risks
    if (report.risks?.length) {
      md += '\n## Risk Mitigation\n\n'
      report.risks.forEach(r => {
        if (r?.risk && r?.mitigation) {
          md += `- **Risk:** ${r.risk}\n  **Mitigation:** ${r.mitigation}\n`
        }
      })
    }
    
    // Next Steps
    if (report.next_steps?.length) {
      md += '\n## Next Steps\n\n'
      report.next_steps.forEach((s, i) => md += `${i + 1}. ${s}\n`)
    }
    
    return md
  }
  
  // Save edited content
  async function saveEditedContent() {
    if (!lastSavedSummaryId) return
    
    try {
      setSavingEdit(true)
      const { error } = await updateSummaryEditedContent(lastSavedSummaryId, editedContent)
      if (error) {
        setError('Failed to save edits')
      } else {
        setIsEditMode(false)
      }
    } finally {
      setSavingEdit(false)
    }
  }
  
  // Render stepper for progress
  function Stepper() {
    const steps = [
      { key: 'experience', label: 'Experience', enabled: true },
      { key: 'stage1', label: 'Your Details', enabled: hasExperience },
      { key: 'stage2', label: 'Organization', enabled: stage1Complete },
      { key: 'stage3', label: 'Project Scope', enabled: stage2Complete },
      { key: 'prelim', label: 'Preliminary', enabled: stage3Complete },
      { key: 'dynamic', label: 'Deep Dive', enabled: stage3Complete },
      { key: 'report', label: 'Starmap Report', enabled: true }
    ]
    
    const activeIndex = steps.findIndex(s => s.key === active)
    const progress = Math.max(0, Math.min(1, activeIndex / (steps.length - 1)))
    
    return (
      <div className="mb-5">
        <div className="glass-card p-4 md:p-6 elevate relative">
          <div className="flex items-center justify-between gap-3">
            <ol className="flex items-center gap-4 overflow-x-auto">
              {steps.map((s, idx) => {
                const isCompleted = idx < activeIndex
                const isActive = idx === activeIndex
                const canNavigate = s.enabled && (isCompleted || isActive)
                
                return (
                  <li key={s.key} className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => canNavigate && setActive(s.key as any)}
                      disabled={!canNavigate}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs md:text-sm ${
                        isActive
                          ? 'border-primary-400 bg-white/10'
                          : isCompleted
                          ? 'border-primary-400/40 bg-primary-400/10'
                          : s.enabled
                          ? 'border-white/10 bg-white/5 hover:bg-white/10'
                          : 'border-white/5 bg-white/5 cursor-not-allowed'
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isCompleted ? 'bg-primary-400 text-slate-900' : isActive ? 'bg-white/90 text-slate-900' : 'bg-white/10'
                      }`}>
                        {isCompleted ? '✓' : (idx + 1)}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">
                {summaryCount}/{SUMMARY_LIMIT} starmaps
              </div>
              {env.isDev && (
                <button
                  type="button"
                  className="icon-btn icon-btn-sm icon-btn-ghost"
                  onClick={autofillDemo}
                  title="Autofill demo data"
                >
                  Autofill
                </button>
              )}
              <button
                type="button"
                className="icon-btn icon-btn-sm icon-btn-ghost"
                onClick={resetAll}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/10" />
          <div
            className="absolute left-0 bottom-0 h-[2px] bg-brand-accent transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className="px-4 py-6 page-enter">
      {/* Lodestar only when editing the report */}
      {active === 'report' && isEditMode && (
        <SolaraLodestar summaryId={lastSavedSummaryId || undefined} />
      )}
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-[92%] max-w-md shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Starmap Limit Reached</h3>
              <p className="text-white/70 mb-4">
                You've reached your limit of {SUMMARY_LIMIT} starmaps. Upgrade to create unlimited starmaps.
              </p>
              <div className="space-y-3">
                <a
                  href="/pricing"
                  className="w-full inline-flex justify-center btn-primary"
                >
                  View Plans & Upgrade
                </a>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full btn-ghost"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loader overlay */}
      {loader.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-card p-5 md:p-6 w-[92%] max-w-md shadow-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-semibold text-white/90">
                  {loader.phase === 'prelim-save'
                    ? 'Saving your draft'
                    : loader.phase === 'prelim'
                    ? 'Preparing your draft'
                    : String(loader.phase).startsWith('dynamic')
                    ? 'Preparing next questions'
                    : loader.phase === 'report'
                    ? 'Creating your starmap'
                    : 'Working on it…'}
                </div>
                <div className="text-xs text-white/70">{loader.message}</div>
              </div>
              <div className="text-[11px] text-white/60 whitespace-nowrap">
                ~{loader.etaSeconds}s
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-brand-accent transition-all duration-200" style={{ width: `${loader.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Stepper />
      
      {error && (
        <div className="mb-4 rounded-xl border-l-4 border-red-400/80 bg-red-500/10 p-3 text-red-200 text-sm">{error}</div>
      )}
      
      {/* Experience Check */}
      {active === 'experience' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Welcome to Starmap Creation</h2>
            <p className="text-white/70 mb-6">
              Let's create a comprehensive L&D strategy tailored to your needs. First, tell us about your experience level.
            </p>
            <div className="max-w-md">
              {EXPERIENCE_LEVELS.map(field => (
                <RenderField
                  key={field.id}
                  field={field}
                  value={experienceAnswer[field.id]}
                  onChange={(id, value) => setExperienceAnswer(prev => ({ ...prev, [id]: value }))}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className={`btn-primary ${hasExperience ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => hasExperience && setActive('stage1')}
                disabled={!hasExperience}
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Stage 1: Requester Details */}
      {active === 'stage1' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Your Details</h2>
            <p className="text-white/60 text-sm mb-6">Tell us about yourself so we can personalize your experience</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAGE1_REQUESTER_FIELDS.map(field => (
                <div key={field.id} className="glass-card p-4">
                  <RenderField
                    field={field}
                    value={stage1Answers[field.id]}
                    onChange={(id, value) => setStage1Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" className="btn-ghost" onClick={() => setActive('experience')}>
                Back
              </button>
              <button
                type="button"
                className={`btn-primary ${stage1Complete ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={completeStage1}
                disabled={!stage1Complete || loading}
              >
                {loading ? 'Researching...' : 'Continue'}
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Stage 2: Organization Information */}
      {active === 'stage2' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Organization Information</h2>
            <p className="text-white/60 text-sm mb-6">Help us understand your organization's context and needs</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAGE2_ORGANIZATION_FIELDS.map(field => (
                <div key={field.id} className={`glass-card p-4 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                  <RenderField
                    field={field}
                    value={stage2Answers[field.id]}
                    onChange={(id, value) => setStage2Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" className="btn-ghost" onClick={() => setActive('stage1')}>
                Back
              </button>
              <button
                type="button"
                className={`btn-primary ${stage2Complete ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={completeStage2}
                disabled={!stage2Complete || loading}
              >
                {loading ? 'Researching...' : 'Continue'}
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Stage 3: Project Scoping */}
      {active === 'stage3' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Project Scoping</h2>
            <p className="text-white/60 text-sm mb-6">Define your L&D initiative requirements and constraints</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAGE3_PROJECT_FIELDS.map(field => (
                <div key={field.id} className={`glass-card p-4 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                  <RenderField
                    field={field}
                    value={stage3Answers[field.id]}
                    onChange={(id, value) => setStage3Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" className="btn-ghost" onClick={() => setActive('stage2')}>
                Back
              </button>
              <button
                type="button"
                className={`btn-primary ${stage3Complete ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={completeStage3}
                disabled={!stage3Complete || loading}
              >
                {loading ? 'Analyzing...' : 'Continue'}
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Dynamic Stages */}
      {active === 'dynamic' && dynamicStages.length > 0 && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {dynamicStages[currentDynamicStage]?.title || 'Additional Questions'}
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Stage {currentDynamicStage + 1} of {dynamicStages.length}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dynamicStages[currentDynamicStage]?.questions.map(field => (
                <div key={field.id} className={`glass-card p-4 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                  <RenderField
                    field={field}
                    value={dynamicStages[currentDynamicStage].answers[field.id]}
                    onChange={(id, value) => {
                      const newStages = [...dynamicStages]
                      newStages[currentDynamicStage].answers[id] = value
                      setDynamicStages(newStages)
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={() => {
                  if (currentDynamicStage > 0) {
                    setCurrentDynamicStage(prev => prev - 1)
                  } else {
                    setActive('stage3')
                  }
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={nextDynamicStage}
                disabled={loading}
              >
                {currentDynamicStage < dynamicStages.length - 1 ? 'Continue' : loading ? 'Generating Report...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Preliminary Report (viewer style, no editing) */}
      {active === 'prelim' && (
        <section className="space-y-4">
          <div className="glass-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-white">Preliminary Master Report</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setActive('stage3')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={confirmPrelimAndProceed}
                  disabled={savingPrelim || loading}
                  title="Save prelim and continue to dynamic questions"
                >
                  {savingPrelim ? 'Saving…' : 'Confirm & Continue'}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <ReportDisplay
                reportMarkdown={editedPrelim}
                reportTitle={reportTitle.trim() || undefined}
                editableTitle={false}
                savingTitle={false}
                hideTitleSection
              />
              {!lastSavedSummaryId && (
                <p className="text-xs text-white/60">
                  A new Starmap record will be created when you confirm.
                </p>
              )}
            </div>
          </div>
        </section>
      )}
      
      {/* Final Report */}
      {active === 'report' && reportMarkdown && (
        <section className="space-y-4">
          <div ref={summaryRef}>
            {!isEditMode ? (
              <ReportDisplay
                reportMarkdown={editedContent}
                reportTitle={reportTitle.trim() || undefined}
                editableTitle={false}
                savingTitle={savingTitle}
                hideTitleSection
                onSaveTitle={async (newTitle) => {
                  if (!lastSavedSummaryId) return
                  try {
                    setSavingTitle(true)
                    const { error } = await updateSummaryTitle(lastSavedSummaryId, newTitle)
                    if (!error) {
                      setReportTitle(newTitle)
                    }
                  } finally {
                    setSavingTitle(false)
                  }
                }}
              />
            ) : (
              <div className="space-y-4">
                {lastSavedSummaryId && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="flex-1 input"
                      placeholder="Report title"
                    />
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={savingTitle || !reportTitle.trim()}
                      onClick={async () => {
                        if (!lastSavedSummaryId || !reportTitle.trim()) return
                        try {
                          setSavingTitle(true)
                          const { error } = await updateSummaryTitle(lastSavedSummaryId, reportTitle.trim())
                          if (!error) {
                            setReportTitle(reportTitle.trim())
                          }
                        } finally {
                          setSavingTitle(false)
                        }
                      }}
                      title="Save title"
                    >
                      {savingTitle ? 'Saving…' : 'Save title'}
                    </button>
                  </div>
                )}
                <AIReportEditorEnhanced
                  summaryId={lastSavedSummaryId || undefined}
                  reportContent={editedContent}
                  greetingReport={greetingReport}
                  orgReport={orgReport}
                  requirementReport={requirementReport}
                  maxEdits={3}
                  onContentChange={setEditedContent}
                  className="min-h-[600px]"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-6">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => window.location.href = '/portal/starmaps'}
            >
              View All Starmaps
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={resetAll}
            >
              Create New Starmap
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
