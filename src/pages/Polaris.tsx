import { useRef, useState, useEffect } from 'react'
import { callLLM } from '@/services/llmClient'
import { saveSummary, getUserSummaryCount, SUMMARY_LIMIT } from '@/services/polarisSummaryService'
import RenderField from '@/polaris/needs-analysis/RenderField'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { EXPERIENCE_LEVELS } from '@/polaris/needs-analysis/experience'
import { NA_STATIC_FIELDS } from '@/polaris/needs-analysis/static'
import { NA_STAGE_TITLE_PROMPT, NA_QUESTIONNAIRE_PROMPT } from '@/polaris/needs-analysis/prompts'
import { NA_REPORT_PROMPT, type NAReport } from '@/polaris/needs-analysis/report'
import { tryExtractJson } from '@/polaris/needs-analysis/json'
import type { NAField, NAResponseMap } from '@/polaris/needs-analysis/types'

// Group static fields into logical sections for responsive tabs/steps
const STATIC_GROUPS_META: Array<{ id: string; label: string; description?: string; fieldIds: string[] }> = [
  {
    id: 'org_audience',
    label: 'Organization & Audience',
    description: 'Basic organization info and target learners',
    fieldIds: ['org_name', 'industry', 'employee_count', 'audience_role'],
  },
  {
    id: 'business_context',
    label: 'Business Context',
    description: 'Objectives, gaps, and geography',
    fieldIds: ['business_objectives', 'performance_gaps', 'geographies'],
  },
  {
    id: 'constraints_prefs',
    label: 'Constraints & Preferences',
    description: 'Budget, timeline, modalities, and constraints',
    fieldIds: ['budget_ceiling', 'time_to_impact', 'preferred_modalities', 'constraints'],
  },
  {
    id: 'systems_data',
    label: 'Systems & Data',
    description: 'Current platforms and metrics',
    fieldIds: ['systems', 'success_metrics'],
  },
  {
    id: 'timeline_schedule',
    label: 'Timeline & Scheduling',
    description: 'Kickoff windows and key dates',
    fieldIds: ['kickoff_window', 'stakeholder_workshop_date'],
  },
  {
    id: 'risk_change',
    label: 'Risk & Change',
    description: 'Risk tolerance and readiness',
    fieldIds: ['risk_tolerance', 'change_readiness'],
  },
  {
    id: 'learner_profile',
    label: 'Learner Familiarization',
    description: 'Understanding your learner population',
    fieldIds: ['learner_age_range', 'learner_tech_savviness', 'learner_education_level', 'learning_preferences', 'prior_training_experience', 'learner_motivation_level', 'accessibility_needs', 'learner_time_availability', 'learner_device_access', 'learner_work_environment', 'learner_language_diversity', 'learner_cultural_factors'],
  },
  {
    id: 'tech_talent',
    label: 'Technology & Talent',
    description: 'Available resources and limitations',
    fieldIds: ['available_technologies', 'tech_expertise_level', 'talent_availability', 'talent_gaps', 'tech_limitations', 'talent_constraints', 'tech_investment_appetite'],
  },
  {
    id: 'content_tools',
    label: 'Content Creation Tools',
    description: 'Authoring, media, AI, platforms & providers for content delivery',
    fieldIds: [
      'content_delivery_types',
      'authoring_tools',
      'video_audio_tools',
      'visual_design_tools',
      'interactive_tools',
      'ai_content_tools',
      'translation_tools',
      'content_libraries',
      'lms_lxp_platforms',
      'assessment_survey_tools',
      'knowledge_doc_tools',
      'other_content_tools',
      'integration_constraints_content_tools',
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Primary stakeholder information',
    fieldIds: ['primary_contact_name', 'primary_contact_role'],
  },
]

export default function Polaris() {
  const [active, setActive] = useState<'experience' | 'static' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'report'>('experience')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryCount, setSummaryCount] = useState<number>(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // State for all responses
  const [experienceAnswer, setExperienceAnswer] = useState<NAResponseMap>({})
  const [staticAnswers, setStaticAnswers] = useState<NAResponseMap>({})
  const [stage2Answers, setStage2Answers] = useState<NAResponseMap>({})
  const [stage3Answers, setStage3Answers] = useState<NAResponseMap>({})
  const [stage4Answers, setStage4Answers] = useState<NAResponseMap>({})
  const [stage5Answers, setStage5Answers] = useState<NAResponseMap>({})
  
  // Dynamic questions state
  const [stage2Questions, setStage2Questions] = useState<NAField[]>([])
  const [stage3Questions, setStage3Questions] = useState<NAField[]>([])
  const [stage4Questions, setStage4Questions] = useState<NAField[]>([])
  const [stage5Questions, setStage5Questions] = useState<NAField[]>([])
  const [shouldShowStage4, setShouldShowStage4] = useState(false)
  
  // Stage titles
  const [stageTitles, setStageTitles] = useState<{ stage2?: string; stage3?: string; stage4?: string; stage5?: string }>({})
  
  // Final report
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  
  // UI state
  const [staticGroupIndex, setStaticGroupIndex] = useState<number>(0)
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const staticTabsContainerRef = useRef<HTMLDivElement | null>(null)
  const staticTabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const staticSectionRef = useRef<HTMLDivElement | null>(null)
  
  // Smooth loading overlay state
  const [loader, setLoader] = useState<{ active: boolean; phase?: string; message: string; progress: number; etaSeconds: number }>({ 
    active: false, message: '', progress: 0, etaSeconds: 0 
  })
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
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

  // Ensure the selected static tab and its content are visible when navigating sections
  useEffect(() => {
    if (active !== 'static') return
    const groups = STATIC_GROUPS_META
    const safeIndex = Math.max(0, Math.min(staticGroupIndex, groups.length - 1))
    const group = groups[safeIndex]
    const btn = group ? staticTabButtonRefs.current[group.id] : null
    if (btn && typeof (btn as any).scrollIntoView === 'function') {
      try {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      } catch {}
    }
    if (staticSectionRef.current && typeof (staticSectionRef.current as any).scrollIntoView === 'function') {
      try {
        staticSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {}
    }
  }, [active, staticGroupIndex])
  
  // Check if experience is selected
  const experienceLevel = experienceAnswer.exp_level as string | undefined
  const hasExperience = !!experienceLevel
  
  // Check if static fields are complete (required fields filled)
  const staticRequiredFields = NA_STATIC_FIELDS.filter(f => f.required)
  const staticComplete = staticRequiredFields.every(f => {
    const val = staticAnswers[f.id]
    switch (f.type) {
      case 'multi_select':
        return Array.isArray(val) && val.length > 0
      case 'calendar_range': {
        const v = (val || {}) as { start?: string; end?: string }
        return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
      }
      case 'calendar_date':
        return typeof val === 'string' && val !== ''
      case 'slider':
      case 'number':
        return typeof val === 'number' && !Number.isNaN(val)
      default:
        return val !== undefined && val !== null && val !== ''
    }
  })
  
  // Helper for smooth loader animation
  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function startSmartLoader(phase: string) {
    const baseTime = phase === 'stage2' ? 8000 : phase === 'stage3' ? 7000 : phase === 'stage4' ? 6500 : phase === 'stage5' ? 6500 : 9000
    const targetMs = Math.min(14000, Math.max(5500, baseTime))
    const start = Date.now()
    
    const step = () => {
      const elapsed = Date.now() - start
      const ratio = Math.min(1, elapsed / targetMs)
      const progress = Math.min(95, Math.max(5, Math.round(easeInOutCubic(ratio) * 95)))
      let message = 'Preparing inputs…'
      if (progress > 15) message = 'Gathering context…'
      if (progress > 45) message = phase === 'report' ? 'Analyzing and drafting report…' : 'Creating tailored questions…'
      if (progress > 70) message = 'Refining structure…'
      if (progress > 85) message = 'Finalizing…'
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

  // Centralized reset to restart the whole process
  function resetAll() {
    try {
      if (loaderIntervalRef.current) {
        clearInterval(loaderIntervalRef.current)
        loaderIntervalRef.current = null
      }
    } catch {}

    setLoader({ active: false, message: '', progress: 0, etaSeconds: 0 })

    setExperienceAnswer({})
    setStaticAnswers({})
    setStage2Answers({})
    setStage3Answers({})
    setStage4Answers({})
    setStage5Answers({})

    setStage2Questions([])
    setStage3Questions([])
    setStage4Questions([])
    setStage5Questions([])

    setReportMarkdown('')
    setStageTitles({})
    setShouldShowStage4(false)
    setStaticGroupIndex(0)
    setActive('experience')
  }

  // Generate Stage 2 questions
  async function generateStage2() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage2')
      
      // Generate stage title
      const titlePrompt = NA_STAGE_TITLE_PROMPT(experienceLevel!, 2, { ...staticAnswers })
      const titleRes = await callLLM([{ role: 'user', content: titlePrompt }])
      const stage2Title = titleRes.content.trim()
      
      // Generate questions
      const questionsPrompt = NA_QUESTIONNAIRE_PROMPT(experienceLevel!, 2, staticAnswers, {})
      const res = await callLLM([{ role: 'user', content: questionsPrompt }])
      const json = JSON.parse(tryExtractJson(res.content))
      
      setStage2Questions(json.questions || [])
      setStageTitles(prev => ({ ...prev, stage2: json.title || stage2Title }))
      setActive('stage2')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 2 questions.')
    } finally {
      setLoading(false)
      stopSmartLoader()
    }
  }

  // Generate Stage 3 questions
  async function generateStage3() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage3')
      
      // Generate stage title
      const titlePrompt = NA_STAGE_TITLE_PROMPT(experienceLevel!, 3, { ...staticAnswers, ...stage2Answers })
      const titleRes = await callLLM([{ role: 'user', content: titlePrompt }])
      const stage3Title = titleRes.content.trim()
      
      // Generate questions
      const questionsPrompt = NA_QUESTIONNAIRE_PROMPT(experienceLevel!, 3, staticAnswers, { ...stage2Answers })
      const res = await callLLM([{ role: 'user', content: questionsPrompt }])
      const json = JSON.parse(tryExtractJson(res.content))
      
      setStage3Questions(json.questions || [])
      setStageTitles(prev => ({ ...prev, stage3: json.title || stage3Title }))
      
      // Determine if Stage 4 is needed (complexity check)
      const hasComplexity = checkComplexity()
      setShouldShowStage4(hasComplexity)
      
      setActive('stage3')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 3 questions.')
    } finally {
      setLoading(false)
      stopSmartLoader()
    }
  }

  // Generate Stage 4 questions (optional, based on complexity)
  async function generateStage4() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage4')
      
      // Generate stage title
      const titlePrompt = NA_STAGE_TITLE_PROMPT(experienceLevel!, 4, { ...staticAnswers, ...stage2Answers, ...stage3Answers })
      const titleRes = await callLLM([{ role: 'user', content: titlePrompt }])
      const stage4Title = titleRes.content.trim()
      
      // Generate questions
      const questionsPrompt = NA_QUESTIONNAIRE_PROMPT(experienceLevel!, 4, staticAnswers, { ...stage2Answers, ...stage3Answers })
      const res = await callLLM([{ role: 'user', content: questionsPrompt }])
      const json = JSON.parse(tryExtractJson(res.content))
      
      setStage4Questions(json.questions || [])
      setStageTitles(prev => ({ ...prev, stage4: json.title || stage4Title }))
      setActive('stage4')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 4 questions.')
    } finally {
      setLoading(false)
      stopSmartLoader()
    }
  }

  // Generate Stage 5 questions (Talent, Tools & Resources consolidation)
  async function generateStage5() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage5')

      const prior = { ...staticAnswers, ...stage2Answers, ...stage3Answers, ...(shouldShowStage4 ? stage4Answers : {}) }
      const titlePrompt = NA_STAGE_TITLE_PROMPT(experienceLevel!, 5 as any, prior)
      const titleRes = await callLLM([{ role: 'user', content: titlePrompt }])
      const stage5Title = titleRes.content.trim()

      const questionsPrompt = NA_QUESTIONNAIRE_PROMPT(experienceLevel!, 5 as any, staticAnswers, { ...stage2Answers, ...stage3Answers, ...(shouldShowStage4 ? stage4Answers : {}) })
      const res = await callLLM([{ role: 'user', content: questionsPrompt }])
      const json = JSON.parse(tryExtractJson(res.content))

      setStage5Questions(json.questions || [])
      setStageTitles(prev => ({ ...prev, stage5: json.title || stage5Title }))
      setActive('stage5')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 5 questions.')
    } finally {
      setLoading(false)
      stopSmartLoader()
    }
  }
  
  // Check complexity to determine if Stage 4 is needed
  function checkComplexity(): boolean {
    const geographies = staticAnswers.geographies as string[] | undefined
    const constraints = staticAnswers.constraints as string[] | undefined
    const hasMultiGeo = geographies && geographies.length > 2
    const hasCompliance = constraints && constraints.includes('Compliance deadlines')
    const hasTightTimeline = staticAnswers.time_to_impact === '< 4 weeks'
    
    return !!(hasMultiGeo && (hasCompliance || hasTightTimeline))
  }
  
  // Generate final report
  async function generateReport() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('report')
      
      const allAnswers = {
        experience: experienceAnswer,
        static: staticAnswers,
        stage2: stage2Answers,
        stage3: stage3Answers,
        ...(shouldShowStage4 ? { stage4: stage4Answers } : {}),
        stage5: stage5Answers,
      }
      
      // Generate structured report
      const reportPrompt = NA_REPORT_PROMPT(experienceLevel!, allAnswers)
      console.log('Generating report with prompt...', reportPrompt.substring(0, 200))
      
      const res = await callLLM([{ role: 'user', content: reportPrompt }])
      console.log('LLM response:', res.content)
      
      let reportJson: NAReport
      try {
        const extractedJson = tryExtractJson(res.content)
        console.log('Extracted JSON:', extractedJson)
        reportJson = JSON.parse(extractedJson) as NAReport
        
        // Validate the report structure
        if (!reportJson || typeof reportJson !== 'object') {
          throw new Error('Invalid report structure: not an object')
        }
        if (!reportJson.summary || !reportJson.summary.problem_statement) {
          throw new Error('Invalid report structure: missing summary.problem_statement')
        }
        if (!reportJson.solution || !reportJson.delivery_plan || !reportJson.measurement) {
          throw new Error('Invalid report structure: missing required sections')
        }
        
        console.log('Parsed report structure:', Object.keys(reportJson))
      } catch (parseError: any) {
        console.error('Failed to parse report JSON:', parseError)
        console.error('Raw response:', res.content)
        
        // Try to create a basic report structure as fallback
        console.log('Attempting to create fallback report structure...')
        reportJson = {
          summary: {
            problem_statement: 'Unable to generate detailed analysis. Please ensure all required fields are filled.',
            current_state: ['Current analysis incomplete'],
            root_causes: ['Insufficient data provided'],
            objectives: ['Complete needs assessment', 'Generate actionable recommendations']
          },
          solution: {
            modalities: [
              { name: 'Blended Learning', reason: 'Combines flexibility with engagement' }
            ],
            scope: {
              audiences: [staticAnswers.audience_role as string || 'Target audience'],
              competencies: ['To be determined based on complete assessment'],
              content_outline: ['Module 1: Foundation', 'Module 2: Application', 'Module 3: Assessment']
            }
          },
          learner_analysis: {
            profile: {
              demographics: [staticAnswers.learner_age_range as string || 'Age range to be assessed', staticAnswers.learner_education_level as string || 'Education level to be assessed'],
              tech_readiness: staticAnswers.learner_tech_savviness ? `Tech savviness level: ${staticAnswers.learner_tech_savviness}/10` : 'Tech readiness to be evaluated',
              learning_style_fit: staticAnswers.learning_preferences as string[] || ['Learning preferences to be identified']
            },
            engagement_strategy: {
              motivation_drivers: ['Motivation factors to be determined'],
              potential_barriers: staticAnswers.accessibility_needs as string[] || ['Barriers to be identified'],
              support_mechanisms: ['Support needs to be assessed']
            },
            design_implications: {
              content_adaptations: ['Content adaptation requirements pending'],
              delivery_adjustments: ['Delivery adjustments to be determined'],
              accessibility_requirements: staticAnswers.accessibility_needs as string[] || ['Accessibility needs to be confirmed'],
              language_considerations: staticAnswers.learner_language_diversity ? [staticAnswers.learner_language_diversity as string] : ['Language requirements to be specified']
            }
          },
          technology_talent: {
            tech_enablers: {
              available: ['Existing infrastructure to be assessed'],
              required: ['Additional tools to be identified'],
              integration_needs: ['Integration requirements pending']
            },
            talent_requirements: {
              internal_roles: ['Team structure to be defined'],
              external_support: ['External resources to be evaluated'],
              development_needs: ['Skills gaps to be identified']
            },
            limitations_impact: {
              tech_constraints: ['Technology constraints to be assessed'],
              talent_gaps_impact: ['Resource impacts to be evaluated'],
              mitigation_strategies: ['Mitigation approaches to be developed']
            }
          },
          delivery_plan: {
            phases: [
              {
                name: 'Discovery',
                duration_weeks: 2,
                goals: ['Complete needs assessment'],
                activities: ['Stakeholder interviews', 'Current state analysis']
              }
            ],
            timeline: [
              { label: 'Phase 1', start: '2025-01-01', end: '2025-02-01' }
            ],
            resources: ['Project manager', 'Instructional designer']
          },
          measurement: {
            success_metrics: ['Completion rate', 'Knowledge transfer', 'Performance improvement'],
            assessment_strategy: ['Pre/post assessments', 'Manager observations'],
            data_sources: ['LMS', 'Performance data']
          },
          budget: {
            notes: 'Budget to be determined based on scope',
            ranges: [
              { item: 'Development', low: 'TBD', high: 'TBD' }
            ]
          },
          risks: [
            { risk: 'Incomplete data', mitigation: 'Conduct follow-up discovery session' }
          ],
          next_steps: ['Review and validate requirements', 'Schedule stakeholder alignment']
        }
        
        console.warn('Using fallback report structure. Original error:', parseError.message)
      }
      
      setReportMarkdown(formatReportAsMarkdown(reportJson))
      
      // Save summary to database
      const summaryContent = formatReportAsMarkdown(reportJson)
      if (summaryContent) {
        try {
          const { error: saveError } = await saveSummary({
            company_name: staticAnswers.org_name as string || null,
            summary_content: summaryContent,
            stage1_answers: { ...experienceAnswer, ...staticAnswers },
            stage2_answers: stage2Answers,
            stage3_answers: { ...stage3Answers, ...(shouldShowStage4 ? stage4Answers : {}), ...stage5Answers },
            stage2_questions: stage2Questions,
            stage3_questions: [...stage3Questions, ...(shouldShowStage4 ? stage4Questions : []), ...stage5Questions],
          })
          
          if (saveError) {
            console.error('Failed to save summary:', saveError)
            if (saveError.message && saveError.message.includes('reached the limit')) {
              setShowUpgradeModal(true)
              setError('You have reached your summary limit. Please upgrade to continue.')
            }
          } else {
            setSummaryCount(prev => prev + 1)
          }
        } catch (saveErr) {
          console.error('Error saving summary:', saveErr)
        }
      }
      
      setActive('report')
    } catch (e: any) {
      setError(e?.message || 'Failed to generate report.')
    } finally {
      setLoading(false)
      stopSmartLoader()
    }
  }

  // Format report as markdown
  function formatReportAsMarkdown(report: NAReport): string {
    if (!report || typeof report !== 'object') {
      console.error('Invalid report object:', report)
      return '# Error\n\nFailed to generate report. Please try again.'
    }
    
    let md = '# Needs Analysis Report\n\n'
    
    // Summary
    if (report.summary) {
      md += '## Executive Summary\n\n'
      if (report.summary.problem_statement) {
        md += `**Problem Statement:** ${report.summary.problem_statement}\n\n`
      }
      if (report.summary.current_state && Array.isArray(report.summary.current_state)) {
        md += '**Current State:**\n'
        report.summary.current_state.forEach(item => md += `- ${item}\n`)
      }
      if (report.summary.root_causes && Array.isArray(report.summary.root_causes)) {
        md += '\n**Root Causes:**\n'
        report.summary.root_causes.forEach(item => md += `- ${item}\n`)
      }
      if (report.summary.objectives && Array.isArray(report.summary.objectives)) {
        md += '\n**Objectives:**\n'
        report.summary.objectives.forEach(item => md += `- ${item}\n`)
      }
    }
    
    // Solution
    if (report.solution) {
      md += '\n## Recommended Solution\n\n'
      if (report.solution.modalities && Array.isArray(report.solution.modalities)) {
        md += '### Delivery Modalities\n'
        report.solution.modalities.forEach(m => {
          if (m && m.name && m.reason) {
            md += `- **${m.name}:** ${m.reason}\n`
          }
        })
      }
      if (report.solution.scope) {
        md += '\n### Scope\n'
        if (report.solution.scope.audiences && Array.isArray(report.solution.scope.audiences)) {
          md += '**Target Audiences:**\n'
          report.solution.scope.audiences.forEach(a => md += `- ${a}\n`)
        }
        if (report.solution.scope.competencies && Array.isArray(report.solution.scope.competencies)) {
          md += '\n**Key Competencies:**\n'
          report.solution.scope.competencies.forEach(c => md += `- ${c}\n`)
        }
        if (report.solution.scope.content_outline && Array.isArray(report.solution.scope.content_outline)) {
          md += '\n**Content Outline:**\n'
          report.solution.scope.content_outline.forEach(c => md += `- ${c}\n`)
        }
      }
    }
    
    // Learner Analysis
    if (report.learner_analysis) {
      md += '\n## Learner Analysis\n\n'
      
      // Learner Profile
      if (report.learner_analysis.profile) {
        md += '### Learner Profile\n'
        if (report.learner_analysis.profile.demographics && Array.isArray(report.learner_analysis.profile.demographics)) {
          md += '**Demographics:**\n'
          report.learner_analysis.profile.demographics.forEach(d => md += `- ${d}\n`)
        }
        if (report.learner_analysis.profile.tech_readiness) {
          md += `\n**Technology Readiness:** ${report.learner_analysis.profile.tech_readiness}\n`
        }
        if (report.learner_analysis.profile.learning_style_fit && Array.isArray(report.learner_analysis.profile.learning_style_fit)) {
          md += '\n**Learning Style Preferences:**\n'
          report.learner_analysis.profile.learning_style_fit.forEach(l => md += `- ${l}\n`)
        }
      }
      
      // Engagement Strategy
      if (report.learner_analysis.engagement_strategy) {
        md += '\n### Engagement Strategy\n'
        if (report.learner_analysis.engagement_strategy.motivation_drivers && Array.isArray(report.learner_analysis.engagement_strategy.motivation_drivers)) {
          md += '**Motivation Drivers:**\n'
          report.learner_analysis.engagement_strategy.motivation_drivers.forEach(m => md += `- ${m}\n`)
        }
        if (report.learner_analysis.engagement_strategy.potential_barriers && Array.isArray(report.learner_analysis.engagement_strategy.potential_barriers)) {
          md += '\n**Potential Barriers:**\n'
          report.learner_analysis.engagement_strategy.potential_barriers.forEach(b => md += `- ${b}\n`)
        }
        if (report.learner_analysis.engagement_strategy.support_mechanisms && Array.isArray(report.learner_analysis.engagement_strategy.support_mechanisms)) {
          md += '\n**Support Mechanisms:**\n'
          report.learner_analysis.engagement_strategy.support_mechanisms.forEach(s => md += `- ${s}\n`)
        }
      }
      
      // Design Implications
      if (report.learner_analysis.design_implications) {
        md += '\n### Design Implications\n'
        if (report.learner_analysis.design_implications.content_adaptations && Array.isArray(report.learner_analysis.design_implications.content_adaptations)) {
          md += '**Content Adaptations:**\n'
          report.learner_analysis.design_implications.content_adaptations.forEach(c => md += `- ${c}\n`)
        }
        if (report.learner_analysis.design_implications.delivery_adjustments && Array.isArray(report.learner_analysis.design_implications.delivery_adjustments)) {
          md += '\n**Delivery Adjustments:**\n'
          report.learner_analysis.design_implications.delivery_adjustments.forEach(d => md += `- ${d}\n`)
        }
        if (report.learner_analysis.design_implications.accessibility_requirements && Array.isArray(report.learner_analysis.design_implications.accessibility_requirements)) {
          md += '\n**Accessibility Requirements:**\n'
          report.learner_analysis.design_implications.accessibility_requirements.forEach(a => md += `- ${a}\n`)
        }
        if (report.learner_analysis.design_implications.language_considerations && Array.isArray(report.learner_analysis.design_implications.language_considerations)) {
          md += '\n**Language Considerations:**\n'
          report.learner_analysis.design_implications.language_considerations.forEach(l => md += `- ${l}\n`)
        }
      }
    }
    
    // Technology & Talent Analysis
    if (report.technology_talent) {
      md += '\n## Technology & Talent Analysis\n\n'
      
      // Tech Enablers
      if (report.technology_talent.tech_enablers) {
        md += '### Technology Enablers\n'
        if (report.technology_talent.tech_enablers.available && Array.isArray(report.technology_talent.tech_enablers.available)) {
          md += '**Available Technologies:**\n'
          report.technology_talent.tech_enablers.available.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.tech_enablers.required && Array.isArray(report.technology_talent.tech_enablers.required)) {
          md += '\n**Required Technologies:**\n'
          report.technology_talent.tech_enablers.required.forEach(t => md += `- ${t}\n`)
        }
        if (report.technology_talent.tech_enablers.integration_needs && Array.isArray(report.technology_talent.tech_enablers.integration_needs)) {
          md += '\n**Integration Requirements:**\n'
          report.technology_talent.tech_enablers.integration_needs.forEach(i => md += `- ${i}\n`)
        }
      }
      
      // Talent Requirements
      if (report.technology_talent.talent_requirements) {
        md += '\n### Talent Requirements\n'
        if (report.technology_talent.talent_requirements.internal_roles && Array.isArray(report.technology_talent.talent_requirements.internal_roles)) {
          md += '**Internal Roles Needed:**\n'
          report.technology_talent.talent_requirements.internal_roles.forEach(r => md += `- ${r}\n`)
        }
        if (report.technology_talent.talent_requirements.external_support && Array.isArray(report.technology_talent.talent_requirements.external_support)) {
          md += '\n**External Support Required:**\n'
          report.technology_talent.talent_requirements.external_support.forEach(e => md += `- ${e}\n`)
        }
        if (report.technology_talent.talent_requirements.development_needs && Array.isArray(report.technology_talent.talent_requirements.development_needs)) {
          md += '\n**Skills Development Needs:**\n'
          report.technology_talent.talent_requirements.development_needs.forEach(d => md += `- ${d}\n`)
        }
      }
      
      // Limitations & Impact
      if (report.technology_talent.limitations_impact) {
        md += '\n### Limitations & Mitigation\n'
        if (report.technology_talent.limitations_impact.tech_constraints && Array.isArray(report.technology_talent.limitations_impact.tech_constraints)) {
          md += '**Technology Constraints:**\n'
          report.technology_talent.limitations_impact.tech_constraints.forEach(c => md += `- ${c}\n`)
        }
        if (report.technology_talent.limitations_impact.talent_gaps_impact && Array.isArray(report.technology_talent.limitations_impact.talent_gaps_impact)) {
          md += '\n**Talent Gaps Impact:**\n'
          report.technology_talent.limitations_impact.talent_gaps_impact.forEach(g => md += `- ${g}\n`)
        }
        if (report.technology_talent.limitations_impact.mitigation_strategies && Array.isArray(report.technology_talent.limitations_impact.mitigation_strategies)) {
          md += '\n**Mitigation Strategies:**\n'
          report.technology_talent.limitations_impact.mitigation_strategies.forEach(m => md += `- ${m}\n`)
        }
      }
    }
    
    // Delivery Plan
    if (report.delivery_plan) {
      md += '\n## Delivery Plan\n\n'
      if (report.delivery_plan.phases && Array.isArray(report.delivery_plan.phases)) {
        md += '### Phases\n'
        report.delivery_plan.phases.forEach(p => {
          if (p && p.name && p.duration_weeks) {
            md += `\n**${p.name}** (${p.duration_weeks} weeks)\n`
            if (p.goals && Array.isArray(p.goals)) {
              md += 'Goals:\n'
              p.goals.forEach(g => md += `- ${g}\n`)
            }
            if (p.activities && Array.isArray(p.activities)) {
              md += 'Activities:\n'
              p.activities.forEach(a => md += `- ${a}\n`)
            }
          }
        })
      }
      
      if (report.delivery_plan.timeline && Array.isArray(report.delivery_plan.timeline)) {
        md += '\n### Timeline\n'
        report.delivery_plan.timeline.forEach(t => {
          if (t && t.label && t.start && t.end) {
            md += `- **${t.label}:** ${t.start} to ${t.end}\n`
          }
        })
      }
      
      if (report.delivery_plan.resources && Array.isArray(report.delivery_plan.resources)) {
        md += '\n### Resources Needed\n'
        report.delivery_plan.resources.forEach(r => md += `- ${r}\n`)
      }
    }
    
    // Measurement
    if (report.measurement) {
      md += '\n## Measurement & Success\n\n'
      if (report.measurement.success_metrics && Array.isArray(report.measurement.success_metrics)) {
        md += '**Success Metrics:**\n'
        report.measurement.success_metrics.forEach(m => md += `- ${m}\n`)
      }
      if (report.measurement.assessment_strategy && Array.isArray(report.measurement.assessment_strategy)) {
        md += '\n**Assessment Strategy:**\n'
        report.measurement.assessment_strategy.forEach(a => md += `- ${a}\n`)
      }
      if (report.measurement.data_sources && Array.isArray(report.measurement.data_sources)) {
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
      if (report.budget.ranges && Array.isArray(report.budget.ranges)) {
        report.budget.ranges.forEach(r => {
          if (r && r.item && r.low && r.high) {
            md += `- **${r.item}:** ${r.low} - ${r.high}\n`
          }
        })
      }
    }
    
    // Risks
    if (report.risks && Array.isArray(report.risks)) {
      md += '\n## Risk Mitigation\n\n'
      report.risks.forEach(r => {
        if (r && r.risk && r.mitigation) {
          md += `- **Risk:** ${r.risk}\n  **Mitigation:** ${r.mitigation}\n`
        }
      })
    }
    
    // Next Steps
    if (report.next_steps && Array.isArray(report.next_steps)) {
      md += '\n## Next Steps\n\n'
      report.next_steps.forEach((s, i) => md += `${i + 1}. ${s}\n`)
    }
    
    return md
  }
  
  // Minimal icon set for Material-inspired icon-only actions
  function IconChevronLeft({ className = '' }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    )
  }

  function IconChevronRight({ className = '' }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    )
  }

  function IconReset({ className = '' }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    )
  }

  // IconPlay removed (unused)

  function IconReport({ className = '' }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    )
  }

  function IconGrid({ className = '' }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  }


  
  
  
  // Stepper component
  function Stepper() {
    const steps: Array<{ key: string; label: string; enabled: boolean }> = [
      { key: 'experience', label: 'Experience Check', enabled: true },
      { key: 'static', label: 'Initial Assessment', enabled: hasExperience },
      { key: 'stage2', label: stageTitles.stage2 || 'Deep Dive', enabled: staticComplete },
      { key: 'stage3', label: stageTitles.stage3 || 'Clarification', enabled: stage2Questions.length > 0 },
      ...(shouldShowStage4 ? [{ key: 'stage4', label: stageTitles.stage4 || 'Final Details', enabled: stage3Questions.length > 0 }] : []),
      { key: 'stage5', label: stageTitles.stage5 || 'Talent, Tools & Resources', enabled: (shouldShowStage4 ? stage4Questions.length > 0 : stage3Questions.length > 0) },
      { key: 'report', label: 'Analysis Report', enabled: stage5Questions.length > 0 },
    ]
    
    const activeIndex = steps.findIndex(s => s.key === active)
    const progress = Math.max(0, Math.min(1, activeIndex / (steps.length - 1)))

    return (
      <div className="mb-5">
        <div className="glass-card p-4 md:p-6 elevate relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative overflow-x-auto hide-scrollbar pr-4 md:pr-6">
              {/* Mobile: progress bar */}
        <div className="md:hidden flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
                <span className="text-xs text-white/70 whitespace-nowrap">{Math.min(activeIndex + 1, steps.length)} / {steps.length}</span>
        </div>
        <div className="md:hidden mt-2">
                <span className="inline-block max-w-full truncate px-2 py-1 text-[11px] rounded-full bg-white/10 border border-white/10 text-white/80">
                  {steps[activeIndex]?.label || ''}
                </span>
        </div>

              {/* Desktop: stepper */}
        <div className="hidden md:block">
          <ol className="flex items-center gap-4 flex-nowrap whitespace-nowrap w-max overflow-x-auto hide-scrollbar">
            {steps.map((s, idx) => {
                    const isCompleted = idx < activeIndex
                    const isActive = idx === activeIndex
                    const canNavigate = s.enabled && (isCompleted || isActive)
                    
              return (
                <li key={s.key} className="flex items-center gap-4">
                  <button
                    type="button"
                    title={s.label}
                          onClick={() => canNavigate && setActive(s.key as any)}
                          disabled={!canNavigate}
                          className={`pressable flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs md:text-sm backdrop-blur-sm ${
                            isActive
                              ? 'border-primary-400 bg-white/10 shadow-[0_0_0_2px_rgba(167,218,219,0.2)_inset]'
                              : isCompleted
                              ? 'border-primary-400/40 bg-primary-400/10 text-primary-200'
                              : s.enabled
                              ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
                              : 'border-white/5 bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                            isCompleted ? 'bg-primary-400 text-slate-900' : isActive ? 'bg-gradient-to-b from-white/90 to-primary-400/80 text-slate-900' : 'bg-white/10 text-white/70'
                          }`}>
                            {isCompleted ? '✓' : (idx + 1)}
                          </span>
                          <span className={`max-w-[240px] truncate font-medium ${
                            isActive ? 'text-white' : isCompleted ? 'text-primary-200' : s.enabled ? 'text-white/85' : 'text-white/40'
                          }`}>
                            {s.label}
                          </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
                {/* Right-edge fade to indicate more content */}
                <div className="fade-right hidden md:block" aria-hidden="true" />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">
                {summaryCount}/{SUMMARY_LIMIT} briefings
              </div>
              <button
                type="button"
                className="icon-btn icon-btn-sm icon-btn-ghost"
                aria-label="Reset"
                title="Reset"
                onClick={resetAll}
              >
                <IconReset className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Progress rail */}
          <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/10 pointer-events-none" />
          <div
            className="absolute left-0 bottom-0 h-[2px] bg-primary-400 transition-all duration-500 pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 page-enter">
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
              <h3 className="text-xl font-semibold text-white mb-2">Briefing Limit Reached</h3>
              <p className="text-white/70 mb-4">
                You've reached your limit of {SUMMARY_LIMIT} briefings. Upgrade to the Pro plan to create unlimited briefings and access advanced features.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => window.open('https://smartslate.io/upgrade', '_blank')}
                  className="w-full btn-primary"
                >
                  Upgrade to Pro
                </button>
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
                  {loader.phase === 'report' ? 'Preparing your report' : 'Setting up your next step'}
                </div>
                <div className="text-xs text-white/70">{loader.message}</div>
              </div>
              <div className="text-[11px] text-white/60 whitespace-nowrap">
                ~{String(Math.floor(loader.etaSeconds / 60)).padStart(1,'0')}:{String(loader.etaSeconds % 60).padStart(2,'0')} left
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all duration-200" style={{ width: `${loader.progress}%` }} />
              </div>
              <div className="mt-2 text-right text-[11px] text-white/60">{loader.progress}%</div>
            </div>
            <div className="mt-3 text-[11px] text-white/50">This takes a few seconds as we tailor content to your inputs.</div>
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
            <h2 className="text-xl font-semibold text-white mb-4">Welcome to Needs Analysis</h2>
            <p className="text-white/70 mb-6">
              Let's start by understanding your experience level so we can tailor the assessment to your needs.
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
                className={`icon-btn icon-btn-primary ${hasExperience ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => hasExperience && setActive('static')}
                disabled={!hasExperience}
                aria-label="Continue"
                title="Continue"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Static Intake */}
      {active === 'static' && (() => {
        const groups = STATIC_GROUPS_META.map(g => ({
          ...g,
          fields: g.fieldIds
            .map(id => NA_STATIC_FIELDS.find(f => f.id === id))
            .filter(Boolean) as NAField[],
        }))
        const current = groups[staticGroupIndex] || groups[0]
        const total = groups.length
        const isFirst = staticGroupIndex === 0
        const isLast = staticGroupIndex === total - 1
        
        // Check if current group's required fields are filled (used below)
        // const currentRequiredComplete = current.fields
        //   .filter(f => f.required)
        //   .every(f => {
        //     const val = staticAnswers[f.id]
        //     if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
        //     return val !== undefined && val !== null && val !== ''
        //   })
        
        return (
          <section className="space-y-4">
            {/* Desktop: tabs */}
            <div className="hidden md:block">
              <div role="tablist" ref={staticTabsContainerRef} className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {groups.map((g, idx) => {
                  const selected = idx === staticGroupIndex
                  const requiredFields = g.fields.filter(f => f.required)
                  const groupComplete = requiredFields.length > 0
                    ? requiredFields.every(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                    : g.fields.some(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                  
                  return (
                    <button
                      ref={(el) => { staticTabButtonRefs.current[g.id] = el }}
                      key={g.id}
                      role="tab"
                      aria-selected={selected}
                      type="button"
                      onClick={() => setStaticGroupIndex(idx)}
                      className={`pressable rounded-full px-3 py-1.5 border text-xs md:text-sm whitespace-nowrap ${
                        selected 
                          ? 'border-primary-400 bg-white/10 text-white' 
                          : 'border-white/10 bg-white/5 text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {g.label}
                        <span
                          className={`ml-1 h-1.5 w-1.5 rounded-full ring-1 ring-black/30 ${groupComplete ? 'bg-green-400' : 'bg-amber-400'}`}
                          aria-label={groupComplete ? 'Complete' : 'Incomplete'}
                          title={groupComplete ? 'Complete' : 'Incomplete'}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mobile: progress & controls */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-400 rounded-full transition-all duration-300" 
                    style={{ width: `${((staticGroupIndex + 1) / total) * 100}%` }} 
                  />
                </div>
                <span className="text-xs text-white/70 whitespace-nowrap">{staticGroupIndex + 1} / {total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">{current.label}</div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    className="icon-btn icon-btn-sm" 
                    onClick={() => setStaticGroupIndex(v => Math.max(0, v - 1))} 
                    disabled={isFirst}
                    aria-label="Previous section"
                    title="Previous section"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  {!isLast && (
                    <button 
                      type="button" 
                      className="icon-btn icon-btn-sm" 
                      onClick={() => setStaticGroupIndex(v => Math.min(total - 1, v + 1))}
                      aria-label="Next section"
                      title="Next section"
                    >
                      <IconChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {/* Mobile section status dots */}
              <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                {groups.map((g, idx) => {
                  const requiredFields = g.fields.filter(f => f.required)
                  const groupComplete = requiredFields.length > 0
                    ? requiredFields.every(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                    : g.fields.some(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setStaticGroupIndex(idx)}
                      aria-label={`Go to ${g.label}`}
                      title={g.label}
                      className={`inline-flex items-center justify-center h-2 w-2 rounded-full ring-1 ring-black/30 ${groupComplete ? 'bg-green-400' : 'bg-amber-400'}`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Fields */}
              <div ref={staticSectionRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 animate-fade-in-up">
              {current.fields.map((field) => (
                <div key={field.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                    <span className="interactive-spotlight" />
                  <RenderField
                    field={field}
                    value={staticAnswers[field.id]}
                    onChange={(id, value) => setStaticAnswers(prev => ({ ...prev, [id]: value }))}
                  />
                  </div>
                ))}
              </div>
            
              {current.description && (
              <p className="text-xs text-white/60">{current.description}</p>
              )}

            {/* Bottom progress & navigation rail */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-200/80 rounded-full bar-smooth" style={{ width: `${((staticGroupIndex + 1) / total) * 100}%` }} />
                </div>
                <span className="text-xs text-white/60 whitespace-nowrap">{staticGroupIndex + 1} / {total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">{current.label}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    onClick={() => setStaticGroupIndex(v => Math.max(0, v - 1))}
                    disabled={isFirst}
                    aria-label="Previous section"
                    title="Previous section"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    onClick={() => {
                      if (!isLast) {
                        setStaticGroupIndex(Math.min(total - 1, staticGroupIndex + 1))
                      } else if (!loading && staticComplete) {
                        generateStage2()
                      }
                    }}
                    disabled={loading || (isLast && !staticComplete)}
                    aria-label={isLast ? (staticComplete ? 'Continue' : 'Complete required fields to continue') : 'Next section'}
                    title={isLast ? (staticComplete ? 'Continue' : 'Complete required fields to continue') : 'Next section'}
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 overflow-x-auto hide-scrollbar">
                {groups.map((g, idx) => {
                  const requiredFields = g.fields.filter(f => f.required)
                  const groupComplete = requiredFields.length > 0
                    ? requiredFields.every(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                    : g.fields.some(f => {
                        const val = staticAnswers[f.id]
                        if (f.type === 'multi_select') return Array.isArray(val) && val.length > 0
                        if (f.type === 'calendar_range') {
                          const v = (val || {}) as { start?: string; end?: string }
                          return typeof v.start === 'string' && v.start !== '' && typeof v.end === 'string' && v.end !== ''
                        }
                        if (f.type === 'calendar_date') return typeof val === 'string' && val !== ''
                        if (f.type === 'slider' || f.type === 'number') return typeof val === 'number' && !Number.isNaN(val)
                        return val !== undefined && val !== null && val !== ''
                      })
                  const isActive = idx === staticGroupIndex
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setStaticGroupIndex(idx)}
                      aria-label={`Go to ${g.label}`}
                      title={g.label}
                      className={`inline-flex items-center justify-center h-2 w-2 rounded-full ring-1 ring-black/30 ${isActive ? 'bg-primary-400' : groupComplete ? 'bg-green-400' : 'bg-amber-400'}`}
                    />
                  )
                })}
              </div>
            </div>
          </section>
        )
      })()}

      {/* Stage 2 */}
      {active === 'stage2' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{stageTitles.stage2 || 'Deep Dive'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage2Questions.map((field) => (
                <div key={field.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <RenderField
                    field={field}
                    value={stage2Answers[field.id]}
                    onChange={(id, value) => setStage2Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <button type="button" className="icon-btn" aria-label="Back" title="Back" onClick={() => setActive('static')}>
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" className="icon-btn icon-btn-primary" aria-label={loading ? 'Generating' : 'Continue'} title={loading ? 'Generating' : 'Continue'} onClick={generateStage3} disabled={loading}>
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Stage 3 */}
      {active === 'stage3' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{stageTitles.stage3 || 'Clarification'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage3Questions.map((field) => (
                <div key={field.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <RenderField
                    field={field}
                    value={stage3Answers[field.id]}
                    onChange={(id, value) => setStage3Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <button type="button" className="icon-btn" aria-label="Back" title="Back" onClick={() => setActive('stage2')}>
              <IconChevronLeft className="w-4 h-4" />
            </button>
            {shouldShowStage4 ? (
              <button type="button" className="icon-btn icon-btn-primary" aria-label={loading ? 'Generating' : 'Continue'} title={loading ? 'Generating' : 'Continue'} onClick={generateStage4} disabled={loading}>
                <IconChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" className="icon-btn icon-btn-primary" aria-label={loading ? 'Generating' : 'Continue'} title={loading ? 'Generating' : 'Continue'} onClick={generateStage5} disabled={loading}>
                <IconChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Stage 4 (optional) */}
      {active === 'stage4' && shouldShowStage4 && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{stageTitles.stage4 || 'Final Details'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage4Questions.map((field) => (
                <div key={field.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <RenderField
                    field={field}
                    value={stage4Answers[field.id]}
                    onChange={(id, value) => setStage4Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
              </div>
                  </div>
          <div className="flex justify-between gap-2">
            <button type="button" className="icon-btn" aria-label="Back" title="Back" onClick={() => setActive('stage3')}>
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" className="icon-btn icon-btn-primary" aria-label={loading ? 'Generating' : 'Continue'} title={loading ? 'Generating' : 'Continue'} onClick={generateStage5} disabled={loading}>
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Stage 5 */}
      {active === 'stage5' && (
        <section className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{stageTitles.stage5 || 'Talent, Tools & Resources'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage5Questions.map((field) => (
                <div key={field.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <RenderField
                    field={field}
                    value={stage5Answers[field.id]}
                    onChange={(id, value) => setStage5Answers(prev => ({ ...prev, [id]: value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <button type="button" className="icon-btn" aria-label="Back" title="Back" onClick={() => (shouldShowStage4 ? setActive('stage4') : setActive('stage3'))}>
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" className="icon-btn icon-btn-primary" aria-label={loading ? 'Analyzing' : 'Generate Report'} title={loading ? 'Analyzing' : 'Generate Report'} onClick={generateReport} disabled={loading}>
              <IconReport className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}
      
      {/* Final Report */}
      {active === 'report' && reportMarkdown && (
        <section className="space-y-4">
          {/* Sticky minimal toolbar */}
          <div className="sticky top-16 z-30 bg-[rgb(var(--bg))]/70 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center justify-between gap-3 px-1 py-2">
              <h3 className="text-lg font-semibold text-white">Needs Analysis Report</h3>
            </div>
          </div>
          
          {/* Use the shared ReportDisplay component */}
          <div ref={summaryRef} className="needs-analysis-report-content">
            <ReportDisplay reportMarkdown={reportMarkdown} />
              </div>

          <div className="flex justify-between gap-2 mt-6">
            <button 
              type="button" 
              className="icon-btn" 
              onClick={() => window.location.href = '/portal/starmaps'}
              aria-label="View all starmaps"
              title="View all starmaps"
            >
              <IconGrid className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              className="icon-btn icon-btn-ghost" 
              onClick={resetAll}
              aria-label="Start new analysis"
              title="Start new analysis"
            >
              <IconReset className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
