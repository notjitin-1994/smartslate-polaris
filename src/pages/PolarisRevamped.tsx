import { useRef, useState, useEffect } from 'react'
import { callLLM } from '@/services/llmClient'
import { saveSummary, getUserSummaryCount, SUMMARY_LIMIT, updateSummaryTitle, updateSummaryPrelimReport, updateSummaryFinalContent, updateSummaryReports } from '@/services/polarisSummaryService'
import { researchGreeting, researchOrganization, researchRequirements, perplexityService } from '@/services/perplexityService'
import RenderField from '@/polaris/needs-analysis/RenderField'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import ReportCardEditor from '@/polaris/needs-analysis/ReportCardEditor'
import { SolaraLodestar } from '@/components'
import { EXPERIENCE_LEVELS } from '@/polaris/needs-analysis/experience'
import { STAGE1_REQUESTER_FIELDS, STAGE2_ORGANIZATION_FIELDS, STAGE3_PROJECT_FIELDS } from '@/polaris/needs-analysis/three-stage-static'
import { NA_STAGE_TITLE_PROMPT, NA_QUESTIONNAIRE_PROMPT } from '@/polaris/needs-analysis/prompts'
import { CUSTOM_DYNAMIC_PROMPTS } from '@/polaris/needs-analysis/customDynamicPrompts'
import { buildFastNAReportPrompt, type NAReport } from '@/polaris/needs-analysis/report'
import { tryExtractJson } from '@/polaris/needs-analysis/json'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'
import { useAuth } from '@/contexts/AuthContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { env } from '@/config/env'
import { formatErrorMessage } from '@/lib/errors'
import { repairNAReport, extractJsonFromText } from '@/utils/reportValidator'
import { createReportJob } from '@/services/reportJobsService'
import '@/utils/apiDiagnostics' // Enable console diagnostics

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
  // const [savingEdit, setSavingEdit] = useState<boolean>(false) // Not currently used
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
      let settled = false
      const id = setTimeout(() => {
        if (!settled) {
          settled = true
          const err: any = new Error(`${label} timed out after ${ms}ms`)
          err.code = 'TIMEOUT'
          reject(err)
        }
      }, ms)
      promise.then(
        (res) => {
          if (!settled) {
            settled = true
            clearTimeout(id)
            resolve(res)
          }
        },
        (err) => {
          if (!settled) {
            settled = true
            clearTimeout(id)
            reject(err)
          }
        }
      )
    })
  }
  
  // Validate and fix preliminary report structure
  function validateAndFixPreliminaryReport(report: string): string {
    const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
    const audience = fmt(stage3Answers.target_audience) || 'Primary learners'
    const objectives = fmt(stage3Answers.project_objectives) || 'Learning objectives to be defined'
    const budget = fmt(stage3Answers.project_budget_range) || 'Budget TBD'
    const tl = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
    
    // Check for required sections and add if missing
    const requiredSections: Array<{ pattern: RegExp; content: string }> = [
      { pattern: /##\s+Executive Summary/i, content: `## Executive Summary\n**Problem Statement:** ${objectives}\n\n**Current State:**\n- Organization requires learning solution\n\n**Root Causes:**\n- Performance gaps identified\n\n**Objectives:**\n- ${objectives}` },
      { pattern: /##\s+Recommended Solution/i, content: `## Recommended Solution\n### Delivery Modalities\n- **Blended Learning:** Balance flexibility and engagement\n\n**Target Audiences:**\n- ${audience}\n\n**Key Competencies:**\n- Core job skills\n\n**Content Outline:**\n- Module 1: Foundations\n- Module 2: Application` },
      { pattern: /##\s+Delivery Plan/i, content: `## Delivery Plan\n**Discovery** (2 weeks)\nGoals:\n- Finalize requirements\nActivities:\n- Stakeholder interviews\n\n### Timeline\n- **Project Window:** ${tl.start || 'TBD'} to ${tl.end || 'TBD'}\n\n### Resources\n- Project team` },
      { pattern: /##\s+Measurement/i, content: `## Measurement\n**Success Metrics:**\n- Completion rate: 85%\n\n**Assessment Strategy:**\n- Pre/post assessments\n\n**Data Sources:**\n- LMS` },
      { pattern: /##\s+Budget/i, content: `## Budget\nNotes: ${budget}\n- **Development:** TBD` },
      { pattern: /##\s+Risk Mitigation/i, content: `## Risk Mitigation\n- **Risk:** Timeline constraints\n  **Mitigation:** Phased approach` },
      { pattern: /##\s+Next Steps/i, content: `## Next Steps\n1. Validate requirements\n2. Confirm budget` }
    ]
    
    let result = report
    for (const section of requiredSections) {
      if (!section.pattern.test(result)) {
        result += `\n\n${section.content}`
      }
    }
    
    // Ensure Recommended Solution has all required subsections
    const recSolMatch = result.match(/(##\s+Recommended Solution[\s\S]*?)(?=\n##\s+|$)/i)
    if (recSolMatch) {
      let recSol = recSolMatch[0]
      
      // Add Delivery Modalities if missing
      if (!/###\s+Delivery Modalities/i.test(recSol)) {
        recSol = recSol.replace(/(##\s+Recommended Solution)/, '$1\n### Delivery Modalities\n- **Blended Learning:** Balance flexibility and engagement')
      }
      
      // Add Target Audiences if missing
      if (!/\*\*Target Audiences?:\*\*/i.test(recSol)) {
        recSol += `\n\n**Target Audiences:**\n- ${audience}`
      }
      
      // Add Key Competencies if missing
      if (!/\*\*Key Competencies:\*\*/i.test(recSol)) {
        recSol += `\n\n**Key Competencies:**\n- Core competencies aligned to objectives`
      }
      
      // Add Content Outline if missing
      if (!/\*\*Content Outline:\*\*/i.test(recSol)) {
        recSol += `\n\n**Content Outline:**\n- Module 1: Foundation\n- Module 2: Application\n- Module 3: Assessment`
      }
      
      result = result.replace(recSolMatch[0], recSol)
    }
    
    return result
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
      
      if (pending.length) {
        try {
          // Use Promise.allSettled with timeout wrapper instead of race
          const settled = await withTimeout(
            Promise.allSettled(pending),
            15000, // Give 15 seconds for research to complete
            'Research promises'
          ).catch(() => [])
          
          if (Array.isArray(settled)) {
            settled.forEach((res, i) => {
              if (res && res.status === 'fulfilled' && typeof res.value === 'string') {
                const k = keys[i]
                if (k === 'greet') {
                  greetingReportRef.current = res.value
                  setGreetingReport(res.value)
                } else if (k === 'org') {
                  orgReportRef.current = res.value
                  setOrgReport(res.value)
                } else if (k === 'req') {
                  requirementReportRef.current = res.value
                  setRequirementReport(res.value)
                }
              }
            })
          }
        } catch (timeoutErr) {
          console.warn('Research promises timeout, continuing with available data:', timeoutErr)
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

      const prelimPrompt = `You are Solara Polaris's expert L&D consultant.  
Adopt a concise, structured, and advisory tone. Your job now is to **synthesize** the earlier reports and stage summaries into a single, coherent **Preliminary Master Report** and generate dynamic follow-up questions.

GOAL
- Produce a clean, Markdown-formatted report using the exact headings and formatting rules below.  
- Integrate and reconcile the content from the three prior reports (greeting/individual, organization, project requirements) plus the stage summaries.  
- Analyze overlaps, contradictions, and gaps — do not simply copy/paste.  
- Create **new, stage-driving questions** that logically follow from the analysis and will unblock deeper discovery/scoping.  

INPUTS (verbatim; do not normalize):
---
GREETING REPORT:
${greetingText}

ORGANIZATION REPORT:
${orgText}

REQUIREMENTS REPORT:
${reqText}

---
STAGE ANSWERS SUMMARY (authoritative user-provided data):
STAGE 1 – REQUESTER & ORG CONTACTS:
${stage1Summary}

STAGE 2 – ORGANIZATION DETAILS:
${stage2Summary}

STAGE 3 – PROJECT SCOPING:
${stage3Summary}

REASONING RULES
- Compare across reports; surface convergences, contradictions, and gaps.  
- If evidence is thin in one report, use authoritative stage answers instead.  
- If still unclear, mark as "Uncertain — requires stakeholder input".  
- Keep recommendations **specific and actionable**.  
- Do not fabricate; ground every claim in provided or well-established L&D practice.  
- Mandatory sections: Always include "## Recommended Solution" with "### Delivery Modalities", "**Target Audiences:**", "**Key Competencies:**", and "**Content Outline:**" — include at least one bullet each; if unknown, write "TBD — requires stakeholder input".  

- Compliance self-check: Before responding, verify these top-level headings exist: "## Executive Summary", "## Recommended Solution", "## Delivery Plan", "## Measurement", "## Budget", "## Risk Mitigation", "## Next Steps". Verify within "Recommended Solution" that "### Delivery Modalities", "**Target Audiences:**", "**Key Competencies:**", and "**Content Outline:**" exist with ≥1 bullet each. If any are missing or empty, revise the report and re-verify until compliant. Do not include this check text in the output.  

OUTPUT — Markdown, using these exact top-level headings and formats:

## Executive Summary
**Problem Statement:** <one sentence>  
**Current State:**  
- <bullet>  
- <bullet>  
**Root Causes:**  
- <bullet>  
- <bullet>  
**Objectives:**  
- <bullet>  
- <bullet>

## Recommended Solution
### Delivery Modalities
- **<Modality>:** <reason>  
**Target Audiences:**  
- <bullet>  
**Key Competencies:**  
- <bullet>  
**Content Outline:**  
- <bullet>  

## Delivery Plan
**<Phase Name>** (<number> weeks)  
Goals:  
- <bullet>  
Activities:  
- <bullet>  

### Timeline
- **<Label>:** yyyy-mm-dd to yyyy-mm-dd  

### Resources
- <role>  

## Measurement
**Success Metrics:**  
- <bullet>  
**Assessment Strategy:**  
- <bullet>  
**Data Sources:**  
- <bullet>  

## Budget
Notes: <one sentence>  
- **<Item>:** <low> – <high>  

## Risk Mitigation
- **Risk:** <text>  
  **Mitigation:** <text>  

## Next Steps
1. <short step>  
2. <short step>  

---
## Dynamic Stage Questions
Generate 4–6 precise, role-appropriate discovery questions that arise from your analysis.  
- They must target **remaining gaps, contradictions, or compliance/strategy dependencies** identified above.  
- Phrase them as clear stakeholder prompts (e.g., "Which compliance audits require evidence of learner certification?").  

DELIVERABLE
Return ONLY the Markdown report in the structure above — no preamble or closing remarks.`

      // Generate prelim via async job (ticket + polling) to avoid client timeouts
      const reasoningModel = (env as any).perplexityPrelimModel || 'sonar-pro'
      const idemKey = `prelim:${(stage2Answers as any)?.org_name || 'org'}:${(stage1Answers as any)?.requester_email || 'user'}:${(stage3Answers as any)?.project_timeline?.start || ''}-${(stage3Answers as any)?.project_timeline?.end || ''}`
      let status_url: string | null = null
      try {
        const submitRes = await fetch('/api/reportJobsDb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
          body: JSON.stringify({ prompt: prelimPrompt, model: reasoningModel, temperature: 0.2, max_tokens: 2600 })
        })
        if (submitRes.ok) {
          const body = await submitRes.json()
          status_url = body?.status_url || null
        } else {
          console.warn('Preliminary job start failed with status', submitRes.status)
        }
      } catch (err) {
        console.warn('Preliminary job start error:', err)
      }

      // Show a quick skeleton prelim immediately while polling
      {
        const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
        const tl = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
        const objectives = fmt(stage3Answers.project_objectives) || 'Objectives to be finalized.'
        const audience = fmt(stage3Answers.target_audience) || 'Primary learners'
        const budget = fmt(stage3Answers.project_budget_range) || 'TBD'
        const tlStart = tl.start || 'TBD'
        const tlEnd = tl.end || 'TBD'
        const skeleton = `## Executive Summary
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
        setPrelimMarkdown(skeleton)
        setEditedPrelim(skeleton)
        setActive('prelim')
      }

      // Poll for completion with backoff, updating loader progress (only if job started)
      let delayMs = 2000
      let prelimText = ''
      const maxPollTime = 60000 // Maximum 60 seconds for polling
      const pollStartTime = Date.now()
      
      if (status_url) {
        for (let attempt = 0; attempt < 30; attempt++) {
          // Check if we've exceeded max polling time
          if (Date.now() - pollStartTime > maxPollTime) {
            console.warn('Polling timeout reached, falling back to direct generation')
            break
          }
          
          await new Promise(resolve => setTimeout(resolve, delayMs))
          
          try {
            const statusRes = await fetch(status_url)
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              if (typeof statusData.percent === 'number' || typeof statusData.eta_seconds === 'number') {
                setLoader(prev => ({ ...prev, message: 'Drafting your preliminary plan…', progress: typeof statusData.percent === 'number' ? statusData.percent : prev.progress, etaSeconds: typeof statusData.eta_seconds === 'number' ? statusData.eta_seconds : prev.etaSeconds }))
              }
              if (statusData.status === 'succeeded') { 
                prelimText = (statusData.result || '').trim()
                console.log('Preliminary report generated successfully via job')
                break 
              }
              if (statusData.status === 'failed') {
                console.error('Job failed:', statusData.error)
                break // Fall back to direct generation
              }
            } else {
              console.warn('Job status check failed:', statusRes.status)
              break // Fall back to direct generation
            }
          } catch (pollError) {
            console.warn('Polling error:', pollError)
            break // Fall back to direct generation
          }
          
          delayMs = Math.min(Math.floor(delayMs * 1.3), 5000) // Less aggressive backoff, cap at 5s
        }
      }
      if (!prelimText) {
        // Fallback: try direct generation to avoid empty prelim in dev or if job router is unavailable
        try {
          setLoader(prev => ({ ...prev, message: 'Finalizing preliminary plan…', progress: Math.max(prev.progress, 85) }))
          const direct = await withTimeout(
            perplexityService.research(prelimPrompt, { model: reasoningModel, temperature: 0.2, maxTokens: 2600 }),
            60000, // Extended timeout for reliable generation
            'Preliminary report (fallback)'
          )
          prelimText = (direct.content || '').trim()
          console.log('Preliminary report generated via direct fallback')
        } catch (e) {
          console.warn('Preliminary direct generation failed; retaining skeleton.', e)
          // Keep the skeleton as is
        }
      }
      let prelim = prelimText || editedPrelim || prelimMarkdown
      
      // Validate and fix prelim structure
      prelim = validateAndFixPreliminaryReport(prelim)
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
      {
        // Enforce Recommended Solution sub-sections if the model omitted or left them empty
        const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
        const audienceFallback = fmt(stage3Answers.target_audience) || 'TBD — requires stakeholder input'
        const defaultModalityLines = [
          '- **Blended Learning:** Balance flexibility and impact',
          '- **Virtual Instructor-Led:** Real-time collaboration across time zones'
        ]
        const defaultCompetencyLines = ['- Align to business goals']
        const defaultOutlineLines = ['- Module 1: Foundations', '- Module 2: Application']

        let out = prelim

        // Ensure Recommended Solution section exists
        if (!/(^|\n)##\s+Recommended Solution/.test(out)) {
          const insertionIdx = out.indexOf('\n## Delivery Plan') >= 0 ? out.indexOf('\n## Delivery Plan') : out.length
          const block = `\n## Recommended Solution\n### Delivery Modalities\n${defaultModalityLines.join('\n')}\n\n**Target Audiences:**\n- ${audienceFallback}\n\n**Key Competencies:**\n${defaultCompetencyLines.join('\n')}\n\n**Content Outline:**\n${defaultOutlineLines.join('\n')}\n\n`
          out = out.slice(0, insertionIdx) + block + out.slice(insertionIdx)
        }

        // Ensure Delivery Modalities heading and at least one bullet
        if (!/(^|\n)###\s+Delivery Modalities/.test(out)) {
          out = out.replace(/(^|\n)##\s+Recommended Solution\s*\n/, `$&### Delivery Modalities\n${defaultModalityLines.join('\n')}\n\n`)
        } else {
          const deliveryBlock = /(^|\n)###\s+Delivery Modalities([\s\S]*?)(?=\n\*\*Target Audiences:\*\*|\n##\s+|\n###\s+|$)/
          const m = out.match(deliveryBlock)
          if (m && !/\n-\s+/.test(m[2])) {
            out = out.replace(deliveryBlock, (_all, p1) => `${p1}### Delivery Modalities\n${defaultModalityLines.join('\n')}\n`)
          }
        }

        // Ensure Target Audiences with at least one bullet
        if (!/(^|\n)\*\*Target Audiences:\*\*/.test(out)) {
          out = out.replace(/(^|\n)###\s+Delivery Modalities[\s\S]*?(?=\n##\s+|$)/, (m) => `${m}\n**Target Audiences:**\n- ${audienceFallback}\n`)
        } else {
          const audBlock = /(^|\n)\*\*Target Audiences:\*\*([\s\S]*?)(?=\n\*\*Key Competencies:\*\*|\n\*\*Content Outline:\*\*|\n##\s+|\n###\s+|$)/
          const m2 = out.match(audBlock)
          if (m2 && !/\n-\s+/.test(m2[2])) {
            out = out.replace(audBlock, `$1**Target Audiences:**\n- ${audienceFallback}\n`)
          }
        }

        // Ensure Key Competencies with at least one bullet
        if (!/(^|\n)\*\*Key Competencies:\*\*/.test(out)) {
          out = out.replace(/(^|\n)\*\*Target Audiences:\*\*[\s\S]*?(?=\n\*\*Content Outline:\*\*|\n##\s+|$)/, (m) => `${m}\n**Key Competencies:**\n${defaultCompetencyLines.join('\\n')}\n`)
        } else {
          const compBlock = /(^|\n)\*\*Key Competencies:\*\*([\s\S]*?)(?=\n\*\*Content Outline:\*\*|\n##\s+|\n###\s+|$)/
          const m3 = out.match(compBlock)
          if (m3 && !/\n-\s+/.test(m3[2])) {
            out = out.replace(compBlock, `$1**Key Competencies:**\n${defaultCompetencyLines.join('\\n')}\n`)
          }
        }

        // Ensure Content Outline with at least one bullet
        if (!/(^|\n)\*\*Content Outline:\*\*/.test(out)) {
          out = out.replace(/(^|\n)\*\*Key Competencies:\*\*[\s\S]*?(?=\n##\s+|$)/, (m) => `${m}\n**Content Outline:**\n${defaultOutlineLines.join('\\n')}\n`)
        } else {
          const outlineBlock = /(^|\n)\*\*Content Outline:\*\*([\s\S]*?)(?=\n##\s+|\n###\s+|$)/
          const m4 = out.match(outlineBlock)
          if (m4 && !/\n-\s+/.test(m4[2])) {
            out = out.replace(outlineBlock, `$1**Content Outline:**\n${defaultOutlineLines.join('\\n')}\n`)
          }
        }

        prelim = out
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
      
      // Always begin with up to 3 custom dynamic stages (if provided), then add auto-generated ones
      const stages: typeof dynamicStages = []

      // Helper to generate one stage (title + questions) given a base prompt body
      async function generateOneStage(stageNum: number, extraInstruction?: string) {
        // Collect all previous answers
        const allPreviousAnswers = {
          ...stage1Answers,
          ...stage2Answers,
          ...stage3Answers,
          ...stages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})
        }

        // Gather prior questions for context
        const priorQuestions = stages.flatMap(s => s.questions?.map(q => ({ id: q.id, label: q.label, type: (q as any).type })) || [])
        const priorAnswers = stages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})

        // Generate title first
        const titlePrompt = `${NA_STAGE_TITLE_PROMPT(experienceLevel!, stageNum as any, allPreviousAnswers)}
        
RESEARCH CONTEXT:
${researchContext}

PRIOR QUESTIONS: ${JSON.stringify(priorQuestions)}
PRIOR ANSWERS: ${JSON.stringify(priorAnswers)}`

        const titleRes = await withTimeout(
          callLLM([{ role: 'user', content: titlePrompt }]),
          45000,
          `Dynamic stage ${stageNum} title`
        )
        const stageTitle = titleRes.content.trim()

        // Generate questions JSON
        const questionsPrompt = `${NA_QUESTIONNAIRE_PROMPT(
          experienceLevel!,
          stageNum as any,
          { ...stage1Answers, ...stage2Answers, ...stage3Answers },
          stages.reduce((acc, s) => ({ ...acc, ...s.answers }), {})
        )}

RESEARCH CONTEXT FOR INFORMED QUESTIONS:
${researchContext}

GATHERED CONTEXT:
- PRIOR QUESTIONS: ${JSON.stringify(priorQuestions)}
- PRIOR ANSWERS: ${JSON.stringify(priorAnswers)}
${extraInstruction ? `
CUSTOM INSTRUCTION:
${extraInstruction}
` : ''}
`

        const res = await withTimeout(
          callLLM([{ role: 'user', content: questionsPrompt }]),
          60000,
          `Dynamic stage ${stageNum} questions`
        )
        const json = JSON.parse(tryExtractJson(res.content))
        stages.push({
          title: json.title || stageTitle,
          questions: json.questions || [],
          answers: {}
        })
      }

      // 1) Up to four custom stages first (will run in order provided)
      const customCount = Math.min(4, CUSTOM_DYNAMIC_PROMPTS.length)
      for (let i = 0; i < customCount; i++) {
        const stageNum = i + 2 // dynamic stages start at 2
        await generateOneStage(stageNum, CUSTOM_DYNAMIC_PROMPTS[i])
      }

      // 2) Auto-generated stages to reach 2-4 total based on complexity
      const targetTotal = Math.min(4, Math.max(2, Math.ceil(Object.keys({
        ...stage1Answers, ...stage2Answers, ...stage3Answers
      }).length / 10)))
      let currentStageNum = customCount + 2
      while (stages.length < targetTotal) {
        await generateOneStage(currentStageNum)
        currentStageNum += 1
      }
      
      // Done building stages
      
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
      const enhancedPrompt = `${buildFastNAReportPrompt(experienceLevel!, allAnswers)}

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

      // Create final report with job-based approach (like preliminary)
      const finalModel = (env as any).perplexityFinalModel || 'sonar-pro'
      const fallbackModel = 'sonar-pro' // Faster model for fallback
      
      // First, try with job-based approach
      let finalReportText = ''
      const jobIdemKey = `final:${(stage2Answers as any)?.org_name || 'org'}:${Date.now()}`
      let jobStatusUrl: string | null = null
      
      try {
        console.log('Submitting final report job with model:', finalModel)
        
        // Use database-backed job system in all environments
        const useDatabase = true
        let jobId: string | null = null
        
        if (useDatabase) {
          // Create job in database
          const { data: job, error } = await createReportJob({
            job_id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            summary_id: lastSavedSummaryId || undefined,
            status: 'queued',
            model: finalModel,
            prompt: `${systemPrompt}\n\n${enhancedPrompt}`.substring(0, 10000),
            temperature: 0.2,
            max_tokens: 4000,
            idempotency_key: jobIdemKey,
            metadata: { type: 'final_report', stage: 'polaris' }
          })
          
          if (!error && job) {
            jobId = job.job_id
            jobStatusUrl = `/api/reportJobsDb?job_id=${job.job_id}`
            console.log('Final report job created in database:', jobId)
            
            // Trigger job execution via API
            try {
              const startRes = await fetch('/api/reportJobsDb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Idempotency-Key': jobIdemKey },
                body: JSON.stringify({ 
                  prompt: `${systemPrompt}\n\n${enhancedPrompt}`, 
                  model: finalModel, 
                  temperature: 0.2, 
                  max_tokens: 4000,
                  summary_id: lastSavedSummaryId,
                  user_id: user?.id
                })
              })
              if (startRes.ok) {
                const body = await startRes.json()
                if (body?.status_url) {
                  jobStatusUrl = body.status_url
                }
              } else {
                console.warn('DB job start returned non-OK status', startRes.status)
              }
            } catch (e) {
              console.warn('Job trigger failed:', e)
            }
          } else {
            console.warn('Database job creation failed, falling back to in-memory:', error)
            // In dev, skip job route and rely on direct generation fallbacks below
          }
        } else {
          // Dev: no job route available; proceed to direct generation fallbacks
        }
        
        if (jobId || jobStatusUrl) {
          console.log('Final report job submitted, polling for results...')
        } else {
          console.warn('Final report job submission failed')
        }
      } catch (err) {
        console.warn('Final report job submission error:', err)
      }
      
      // Check if using reasoning model (which takes longer)
      const isReasoningModel = finalModel.toLowerCase().includes('reasoning')
      
      // Poll for job completion (extend time for reasoning models)
      if (jobStatusUrl) {
        const pollStartTime = Date.now()
        const maxPollTime = isReasoningModel ? 90000 : 75000 // 90s for reasoning, 75s for others
        let pollDelay = 2000
        
        // Option to enable async mode (don't wait, check later)
        const asyncMode = isReasoningModel && localStorage.getItem('polaris_async_mode') === 'true'
        
        if (asyncMode) {
          // Store job info and return placeholder
          console.log('Async mode enabled for reasoning model, will check status later')
          localStorage.setItem(`polaris_job_${lastSavedSummaryId || 'temp'}`, jobStatusUrl)
          
          // Return a placeholder that tells user to check back
          finalReportText = JSON.stringify({
            summary: {
              problem_statement: 'Report is being generated in the background',
              current_state: ['Your comprehensive report is being created using advanced AI'],
              root_causes: ['This process typically takes 1-2 minutes'],
              objectives: ['Check back shortly or refresh the page to see your completed report'],
              assumptions: [],
              unknowns: [],
              confidence: 1.0
            },
            _async_job: jobStatusUrl,
            _message: 'Your report is being generated. This page will auto-refresh when complete.'
          })
        } else {
          // Normal polling mode
          for (let attempt = 0; attempt < (isReasoningModel ? 45 : 25); attempt++) {
            if (Date.now() - pollStartTime > maxPollTime) {
              console.warn('Final report polling timeout, trying fallback')
              break
            }
            
            await new Promise(resolve => setTimeout(resolve, pollDelay))
            
            try {
              const statusRes = await fetch(jobStatusUrl)
              if (statusRes.ok) {
                const statusData = await statusRes.json()
                if (statusData.status === 'succeeded') {
                  finalReportText = (statusData.result || '').trim()
                  console.log('Final report generated via job')
                  break
                }
                if (statusData.status === 'failed') {
                  console.error('Final report job failed:', statusData.error)
                  break
                }
              }
            } catch (pollError) {
              console.warn('Final report polling error:', pollError)
              break
            }
            
            pollDelay = Math.min(pollDelay * 1.2, 4000) // Cap at 4s
          }
        }
      }
      
      // Fallback 1: Try with faster model
      if (!finalReportText) {
        try {
          console.log('Trying fallback with faster model:', fallbackModel)
          setLoader(prev => ({ ...prev, message: 'Optimizing report generation...', progress: 70 }))
          
          const fallbackRes = await withTimeout(
            perplexityService.research(`${systemPrompt}\n\n${enhancedPrompt}`, { 
              model: fallbackModel, 
              temperature: 0.2, 
              maxTokens: 3500 
            }),
            45000, // 45 second timeout for faster model
            'Final report (fast model)'
          )
          finalReportText = (fallbackRes.content || '').trim()
          console.log('Final report generated with fallback model')
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError)
        }
      }
      
      // Fallback 2: Use simplified prompt with base model
      if (!finalReportText) {
        try {
          console.log('Using simplified prompt with base model')
          setLoader(prev => ({ ...prev, message: 'Generating simplified report...', progress: 80 }))
          
          // Reduce prompt size by removing some context
          const simplifiedPrompt = buildFastNAReportPrompt(experienceLevel!, allAnswers)
          
          const simpleRes = await withTimeout(
            perplexityService.research(simplifiedPrompt, { 
              model: 'sonar', 
              temperature: 0.3, 
              maxTokens: 3000 
            }),
            30000, // 30 second timeout for base model
            'Final report (simplified)'
          )
          finalReportText = (simpleRes.content || '').trim()
          console.log('Final report generated with simplified prompt')
        } catch (simpleError) {
          console.error('Simplified prompt also failed:', simpleError)
        }
      }
      
      // Fallback 3: Try with minimal prompt
      if (!finalReportText) {
        try {
          console.log('Using minimal prompt as last resort')
          setLoader(prev => ({ ...prev, message: 'Creating report with minimal data...', progress: 85 }))
          
          // Ultra-minimal prompt with just essentials
          const minimalPrompt = `Create a brief L&D report JSON for:
- Organization: ${stage2Answers.org_name || 'Company'}
- Objective: ${stage3Answers.project_objectives || 'Training initiative'}
- Audience: ${stage3Answers.target_audience || 'Employees'}
- Budget: ${stage3Answers.project_budget_range || 'TBD'}

Return ONLY valid JSON matching the NAReport schema with these sections: summary, solution, learner_analysis, technology_talent, delivery_plan, measurement, budget, risks, next_steps.`
          
          const minimalRes = await withTimeout(
            perplexityService.research(minimalPrompt, { 
              model: 'sonar', 
              temperature: 0.5, 
              maxTokens: 2000 
            }),
            20000, // 20 second timeout
            'Final report (minimal)'
          )
          finalReportText = (minimalRes.content || '').trim()
          console.log('Final report generated with minimal prompt')
        } catch (minimalError) {
          console.error('Minimal prompt also failed:', minimalError)
        }
      }
      
      // Fallback 4: Test API connectivity first
      if (!finalReportText) {
        try {
          console.log('Testing API connectivity...')
          const testRes = await withTimeout(
            perplexityService.research('Return "OK"', { 
              model: 'sonar', 
              temperature: 0, 
              maxTokens: 10 
            }),
            10000,
            'API connectivity test'
          )
          console.log('API test response:', testRes)
        } catch (testError: any) {
          console.error('API connectivity test failed:', testError)
          // Use formatErrorMessage for consistent error messages
          const errorMessage = formatErrorMessage(testError)
          setError(errorMessage)
        }
      }
      
      // Ultimate fallback: Generate report locally without API
      if (!finalReportText) {
        console.warn('All API attempts failed. Generating local report...')
        setLoader(prev => ({ ...prev, message: 'Generating report locally...', progress: 90 }))
        
        // Generate a comprehensive report using only the data we have
        const localReport = createFallbackReport()
        
        // Add dynamic answers to the report
        if (dynamicStages.length > 0) {
          const dynamicInsights = dynamicStages.map(stage => 
            stage.questions.map(q => {
              const answer = stage.answers[q.id]
              return answer ? `${q.label}: ${Array.isArray(answer) ? answer.join(', ') : answer}` : null
            }).filter(Boolean).join('; ')
          ).filter(Boolean).join(' | ')
          
          if (dynamicInsights && localReport.summary) {
            localReport.summary.current_state.push(`Additional insights: ${dynamicInsights.substring(0, 200)}`)
          }
        }
        
        finalReportText = JSON.stringify(localReport)
        console.log('Using locally generated fallback report')
        setError('Note: Report was generated offline due to API connectivity issues. Some advanced analysis may be limited.')
      }
      
      const res = { content: finalReportText }
      
      let reportJson: NAReport
      try {
        // Use improved JSON extraction
        const extractedJson = extractJsonFromText(res.content)
        console.log('Extracted JSON length:', extractedJson.length)
        
        // Try to parse the JSON
        let parsedJson: any
        try {
          parsedJson = JSON.parse(extractedJson)
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError)
          console.log('First 500 chars of extracted:', extractedJson.substring(0, 500))
          throw new Error('Invalid JSON format')
        }
        
        // Validate report structure
        if (!parsedJson || typeof parsedJson !== 'object') {
          throw new Error('Report is not an object')
        }
        
        if (!parsedJson.summary) {
          console.warn('Missing summary section, adding default')
          parsedJson.summary = {
            problem_statement: stage3Answers.project_objectives as string || 'Learning initiative',
            current_state: ['Assessment in progress'],
            root_causes: ['To be determined'],
            objectives: ['Improve performance'],
            assumptions: [],
            unknowns: [],
            confidence: 0.5
          }
        }
        
        if (!parsedJson.summary.problem_statement) {
          parsedJson.summary.problem_statement = stage3Answers.project_objectives as string || 'Learning initiative required'
        }
        
        // Use the repair function to ensure all required sections
        reportJson = repairNAReport(parsedJson, {
          objectives: stage3Answers.project_objectives as string,
          audience: stage3Answers.target_audience as string,
          budget: stage3Answers.project_budget_range as string,
          timeline: stage3Answers.project_timeline as { start?: string; end?: string }
        })
        
        // Additional validation
        reportJson = ensureMinimumFinalSections(reportJson)
        console.log('Report successfully parsed, repaired and validated')
      } catch (parseError: any) {
        console.error('Failed to parse report JSON:', parseError.message)
        console.warn('Using comprehensive fallback report')
        // Create fallback report with actual data
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
    const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
    const tl = (stage3Answers.project_timeline || {}) as { start?: string; end?: string }
    const objectives = fmt(stage3Answers.project_objectives) || 'Objectives to be defined'
    const audience = fmt(stage3Answers.target_audience) || 'Target audience to be specified'
    const budget = fmt(stage3Answers.project_budget_range) || 'Budget to be determined'
    const orgName = fmt(stage2Answers.org_name) || 'Organization'
    
    return {
      summary: {
        problem_statement: objectives || 'Learning initiative to address organizational needs',
        current_state: [
          `${orgName} requires learning solution for ${audience}`,
          'Current capabilities and gaps being assessed'
        ],
        root_causes: [
          'Performance gaps identified in target population',
          'Skills alignment needed with business objectives'
        ],
        objectives: [
          objectives || 'Improve performance and capability',
          'Align learning outcomes with business goals'
        ],
        assumptions: [
          'Learners have access to required technology',
          'Organization supports learning initiative'
        ],
        unknowns: [
          'Specific learner readiness levels',
          'Integration requirements with existing systems'
        ],
        confidence: 0.6,
      },
      solution: {
        delivery_modalities: [
          { modality: 'Blended Learning', reason: 'Balances flexibility with engagement', priority: 1 },
          { modality: 'Self-Paced Online', reason: 'Accommodates distributed workforce', priority: 2 }
        ],
        target_audiences: [audience || 'Primary learner population'],
        key_competencies: [
          'Core job-specific skills',
          'Professional development capabilities',
          'Technology proficiency'
        ],
        content_outline: [
          'Module 1: Foundation Concepts',
          'Module 2: Practical Application',
          'Module 3: Assessment and Certification'
        ],
        accessibility_and_inclusion: {
          standards: ['WCAG 2.2 AA', 'Section 508'],
          notes: 'Ensure multi-language support and accessibility features'
        },
      },
      learner_analysis: {
        profiles: [
          {
            segment: 'Primary Learners',
            roles: [audience || 'Target roles'],
            context: 'Professional development context',
            motivators: ['Career advancement', 'Skill development', 'Performance improvement'],
            constraints: ['Time availability', 'Technology access', 'Work schedule']
          },
        ],
        readiness_risks: [
          'Variable technology proficiency levels',
          'Competing work priorities',
          'Change resistance'
        ],
      },
      technology_talent: {
        technology: {
          current_stack: fmt(stage3Answers.available_software)?.split(',').map((s: string) => s.trim()) || ['LMS', 'Collaboration tools'],
          gaps: ['Advanced analytics', 'Mobile learning platform', 'AI-powered personalization'],
          recommendations: [
            { capability: 'Modern LMS/LXP', fit: 'Scalable learning delivery', constraints: ['Budget', 'IT approval'] },
            { capability: 'Analytics platform', fit: 'Performance tracking', constraints: ['Integration complexity'] }
          ],
          data_plan: {
            standards: ['xAPI', 'SCORM 2004'],
            integrations: ['HRIS', 'Performance management', 'SSO']
          },
        },
        talent: {
          available_roles: ['Subject Matter Experts', 'Instructional Designers', 'Project Manager'],
          gaps: ['Technical developers', 'QA specialists', 'Data analysts'],
          recommendations: [
            'Augment team with contract IDs for peak development',
            'Establish SME advisory board',
            'Allocate PM resources for coordination'
          ],
        },
      },
      delivery_plan: {
        phases: [
          { name: 'Discovery & Planning', duration_weeks: 2, goals: ['Finalize requirements', 'Stakeholder alignment'], activities: ['Interviews', 'Current state analysis', 'Gap assessment'] },
          { name: 'Design & Development', duration_weeks: 8, goals: ['Content creation', 'Platform setup'], activities: ['Curriculum design', 'Content development', 'System configuration'] },
          { name: 'Pilot & Refinement', duration_weeks: 4, goals: ['Test and optimize'], activities: ['Pilot delivery', 'Feedback collection', 'Content refinement'] },
          { name: 'Full Deployment', duration_weeks: 2, goals: ['Launch at scale'], activities: ['Rollout', 'Support setup', 'Performance monitoring'] }
        ],
        timeline: [
          { label: 'Project kickoff', start: tl.start || null, end: null },
          { label: 'Pilot launch', start: null, end: null },
          { label: 'Full deployment', start: null, end: tl.end || null }
        ],
        resources: ['Project Manager', 'Instructional Designer', 'SMEs', 'Technical support'],
      },
      measurement: {
        success_metrics: [
          { metric: 'Completion rate', baseline: null, target: '85%', timeframe: tl.end || '2025-12-31' },
          { metric: 'Knowledge transfer', baseline: null, target: '80% pass rate', timeframe: tl.end || '2025-12-31' },
          { metric: 'Performance improvement', baseline: null, target: '15% increase', timeframe: '2026-03-31' }
        ],
        assessment_strategy: ['Pre/post assessments', 'Performance observations', 'Manager evaluations', '360-degree feedback'],
        data_sources: ['LMS', 'HRIS', 'Performance management system', 'Survey platform'],
        learning_analytics: {
          levels: ['Kirkpatrick Level 1-4', 'Phillips ROI'],
          reporting_cadence: 'monthly'
        },
      },
      budget: {
        currency: 'USD',
        notes: budget ? `Budget range: ${budget}` : 'Budget allocation pending approval',
        items: [
          { item: 'Development', low: 50000, high: 150000 },
          { item: 'Technology', low: 20000, high: 50000 },
          { item: 'Resources', low: 30000, high: 80000 }
        ],
      },
      risks: [
        { risk: 'Stakeholder alignment', mitigation: 'Regular communication and feedback loops', severity: 'medium', likelihood: 'medium' },
        { risk: 'Technology integration', mitigation: 'Phased implementation with testing', severity: 'high', likelihood: 'low' },
        { risk: 'Learner engagement', mitigation: 'Incentives and manager support', severity: 'medium', likelihood: 'medium' }
      ],
      next_steps: [
        'Validate requirements with key stakeholders',
        'Finalize budget and resource allocation',
        'Establish project governance structure',
        'Begin detailed design phase'
      ],
    }
  }

  // Ensure minimum viable sections for the final JSON prior to formatting
  function ensureMinimumFinalSections(input: NAReport): NAReport {
    const clone: NAReport = JSON.parse(JSON.stringify(input || {}))
    // Ensure solution recommendations
    if (!clone.solution) (clone as any).solution = {} as any
    if (!Array.isArray((clone as any).solution.delivery_modalities) || (clone as any).solution.delivery_modalities.length === 0) {
      ;(clone as any).solution.delivery_modalities = [
        { modality: 'Blended Learning', reason: 'Balances flexibility and impact', priority: 1 }
      ]
    }
    if (!Array.isArray((clone as any).solution.target_audiences) || (clone as any).solution.target_audiences.length === 0) {
      const fmt = (v: any) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : (v ?? ''))
      const audience = fmt((stage3Answers as any)?.target_audience) || 'Primary learners'
      ;(clone as any).solution.target_audiences = [audience]
    }
    if (!Array.isArray((clone as any).solution.key_competencies) || (clone as any).solution.key_competencies.length === 0) {
      ;(clone as any).solution.key_competencies = ['Core competencies aligned to objectives']
    }
    if (!Array.isArray((clone as any).solution.content_outline) || (clone as any).solution.content_outline.length === 0) {
      ;(clone as any).solution.content_outline = ['Module 1: Foundations', 'Module 2: Application', 'Module 3: Assessment']
    }
    // Ensure measurement metrics structure
    if (!clone.measurement || !Array.isArray((clone as any).measurement.success_metrics)) {
      (clone as any).measurement = (clone as any).measurement || {}
      ;(clone as any).measurement.success_metrics = []
    }
    (clone as any).measurement.success_metrics = (clone as any).measurement.success_metrics.map((m: any) => {
      if (m && typeof m === 'object' && 'metric' in m) return m
      return { metric: String(m || 'Completion rate'), baseline: null, target: '85%', timeframe: '2025-12-31' }
    })
    if ((clone as any).measurement.success_metrics.length === 0) {
      ;(clone as any).measurement.success_metrics = [
        { metric: 'Completion rate', baseline: null, target: '85%', timeframe: '2025-12-31' }
      ]
    }
    return clone
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
      if (report.summary.assumptions?.length) {
        md += '\n**Assumptions:**\n'
        report.summary.assumptions.forEach(item => md += `- ${item}\n`)
      }
      if (report.summary.unknowns?.length) {
        md += '\n**Unknowns:**\n'
        report.summary.unknowns.forEach(item => md += `- ${item}\n`)
      }
      md += `\n**Confidence:** ${typeof report.summary.confidence === 'number' ? report.summary.confidence.toFixed(2) : '0.00'}\n`
    }
    
    // Solution Recommendations
    if (report.solution) {
      md += '\n## Recommended Solution\n\n'
      if (report.solution.delivery_modalities?.length) {
        md += '### Delivery Modalities\n'
        report.solution.delivery_modalities.forEach(m => {
          if (m?.modality && m?.reason) {
            md += `- **${m.modality} (P${m.priority ?? 1})**: ${m.reason}\n`
          }
        })
      }
      if (report.solution.target_audiences?.length) {
        md += '\n**Target Audiences:**\n'
        report.solution.target_audiences.forEach(a => md += `- ${a}\n`)
      }
      if (report.solution.key_competencies?.length) {
        md += '\n**Key Competencies:**\n'
        report.solution.key_competencies.forEach(c => md += `- ${c}\n`)
      }
      if (report.solution.content_outline?.length) {
        md += '\n**Content Outline:**\n'
        report.solution.content_outline.forEach(c => md += `- ${c}\n`)
      }
      if (report.solution.accessibility_and_inclusion) {
        md += '\n### Accessibility & Inclusion\n'
        if (report.solution.accessibility_and_inclusion.standards?.length) {
          md += '**Standards:**\n'
          report.solution.accessibility_and_inclusion.standards.forEach(s => md += `- ${s}\n`)
        }
        if (report.solution.accessibility_and_inclusion.notes) {
          md += `\n**Notes:** ${report.solution.accessibility_and_inclusion.notes}\n`
        }
      }
    }
    
    // Learner Analysis (new schema)
    if (report.learner_analysis) {
      md += '\n## Learner Analysis\n\n'
      if (report.learner_analysis.profiles?.length) {
        md += '### Learner Profiles\n'
        report.learner_analysis.profiles.forEach(p => {
          md += `- **${p.segment}:** Roles: ${p.roles.join(', ')}${p.context ? ` | Context: ${p.context}` : ''}\n`
          if (p.motivators?.length) md += `  Motivators: ${p.motivators.join(', ')}\n`
          if (p.constraints?.length) md += `  Constraints: ${p.constraints.join(', ')}\n`
        })
      }
      if (report.learner_analysis.readiness_risks?.length) {
        md += '\n**Readiness Risks:**\n'
        report.learner_analysis.readiness_risks.forEach(r => md += `- ${r}\n`)
      }
    }
    
    // Technology & Talent (new schema)
    if (report.technology_talent) {
      md += '\n## Technology & Talent Analysis\n\n'
      
      // Technology
      if (report.technology_talent.technology) {
        md += '### Technology\n'
        if (report.technology_talent.technology.current_stack?.length) {
          md += '**Current Stack:**\n'
          report.technology_talent.technology.current_stack.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.technology.gaps?.length) {
          md += '\n**Gaps:**\n'
          report.technology_talent.technology.gaps.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.technology.recommendations?.length) {
          md += '\n**Recommendations:**\n'
          report.technology_talent.technology.recommendations.forEach(r => md += `- ${r.capability} — ${r.fit}${r.constraints?.length ? ` (Constraints: ${r.constraints.join(', ')})` : ''}\n`)
        }
        if (report.technology_talent.technology.data_plan) {
          if (report.technology_talent.technology.data_plan.standards?.length) {
            md += '\n**Data Standards:**\n'
            report.technology_talent.technology.data_plan.standards.forEach(s => md += `- ${s}\n`)
          }
          if (report.technology_talent.technology.data_plan.integrations?.length) {
            md += '\n**Integrations:**\n'
            report.technology_talent.technology.data_plan.integrations.forEach(i => md += `- ${i}\n`)
          }
        }
      }
      
      // Talent
      if (report.technology_talent.talent) {
        md += '\n### Talent\n'
        if (report.technology_talent.talent.available_roles?.length) {
          md += '**Available Roles:**\n'
          report.technology_talent.talent.available_roles.forEach(r => md += `- ${r}\n`)
        }
        if (report.technology_talent.talent.gaps?.length) {
          md += '\n**Gaps:**\n'
          report.technology_talent.talent.gaps.forEach(g => md += `- ${g}\n`)
        }
        if (report.technology_talent.talent.recommendations?.length) {
          md += '\n**Recommendations:**\n'
          report.technology_talent.talent.recommendations.forEach(rec => md += `- ${rec}\n`)
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
    
    // Measurement & Analytics (new schema)
    if (report.measurement) {
      md += '\n## Measurement\n\n'
      if (report.measurement.success_metrics?.length) {
        md += '### Success Metrics\n'
        report.measurement.success_metrics.forEach(m => {
          md += `- ${m.metric}${m.baseline ? ` (Baseline: ${m.baseline})` : ''} → Target: ${m.target} by ${m.timeframe}\n`
        })
      }
      if (report.measurement.assessment_strategy?.length) {
        md += '\n### Assessment Strategy\n'
        report.measurement.assessment_strategy.forEach(a => md += `- ${a}\n`)
      }
      if (report.measurement.data_sources?.length) {
        md += '\n### Data Sources\n'
        report.measurement.data_sources.forEach(d => md += `- ${d}\n`)
      }
      if (report.measurement.learning_analytics) {
        md += '\n### Learning Analytics\n'
        if (report.measurement.learning_analytics.levels?.length) {
          md += '**Levels:**\n'
          report.measurement.learning_analytics.levels.forEach(l => md += `- ${l}\n`)
        }
        if (typeof report.measurement.learning_analytics.reporting_cadence === 'string') {
          md += `\n**Reporting Cadence:** ${report.measurement.learning_analytics.reporting_cadence}\n`
        }
      }
    }
    
    // Budget (new schema)
    if (report.budget) {
      md += '\n## Budget\n\n'
      md += `**Currency:** ${report.budget.currency || 'USD'}\n`
      if (report.budget.notes) {
        md += `\nNotes: ${report.budget.notes}\n`
      }
      if (report.budget.items?.length) {
        report.budget.items.forEach(b => {
          md += `- **${b.item}:** ${b.low} - ${b.high}\n`
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
      report.next_steps.forEach((s: string, i: number) => md += `${i + 1}. ${s}\n`)
    }
    
    return md
  }
  
  // Save edited content (currently not used but may be needed for future editing features)
  // async function saveEditedContent() {
  //   if (!lastSavedSummaryId) return
  //   
  //   try {
  //     setSavingEdit(true)
  //     const { error } = await updateSummaryEditedContent(lastSavedSummaryId, editedContent)
  //     if (error) {
  //       setError('Failed to save edits')
  //     } else {
  //       setIsEditMode(false)
  //     }
  //   } finally {
  //     setSavingEdit(false)
  //   }
  // }
  
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
                  <ReportCardEditor
                    markdown={editedContent}
                    onChange={setEditedContent}
                    className="min-h-[600px]"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-6">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => window.location.href = '/starmaps'}
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
