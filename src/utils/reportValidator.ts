// Report validation and repair utilities
import type { NAReport } from '@/polaris/needs-analysis/report'

/**
 * Validates that a report has all required sections and structure
 */
export function validateNAReport(report: any): report is NAReport {
  if (!report || typeof report !== 'object') return false
  
  // Check required top-level sections
  const requiredSections = [
    'summary',
    'solution',
    'learner_analysis',
    'technology_talent',
    'delivery_plan',
    'measurement',
    'budget',
    'risks',
    'next_steps'
  ]
  
  for (const section of requiredSections) {
    if (!(section in report)) {
      console.warn(`Missing required section: ${section}`)
      return false
    }
  }
  
  // Validate summary structure
  if (!report.summary?.problem_statement) {
    console.warn('Missing summary.problem_statement')
    return false
  }
  
  // Validate solution structure
  if (!Array.isArray(report.solution?.delivery_modalities)) {
    console.warn('solution.delivery_modalities must be an array')
    return false
  }
  
  return true
}

/**
 * Repairs a partially valid report by adding missing sections
 */
export function repairNAReport(report: any, fallbackData?: {
  objectives?: string
  audience?: string
  budget?: string
  timeline?: { start?: string; end?: string }
}): NAReport {
  const repaired: any = { ...report }
  
  // Ensure all top-level sections exist
  if (!repaired.summary) {
    repaired.summary = {
      problem_statement: fallbackData?.objectives || 'Learning initiative required',
      current_state: ['Assessment in progress'],
      root_causes: ['To be determined'],
      objectives: ['Improve performance'],
      assumptions: [],
      unknowns: [],
      confidence: 0.5
    }
  } else {
    // Ensure summary has all required fields
    repaired.summary.problem_statement = repaired.summary.problem_statement || fallbackData?.objectives || 'Learning initiative'
    repaired.summary.current_state = repaired.summary.current_state || []
    repaired.summary.root_causes = repaired.summary.root_causes || []
    repaired.summary.objectives = repaired.summary.objectives || []
    repaired.summary.assumptions = repaired.summary.assumptions || []
    repaired.summary.unknowns = repaired.summary.unknowns || []
    repaired.summary.confidence = repaired.summary.confidence ?? 0.5
  }
  
  // Ensure solution section
  if (!repaired.solution) {
    repaired.solution = {
      delivery_modalities: [
        { modality: 'Blended Learning', reason: 'Balanced approach', priority: 1 }
      ],
      target_audiences: [fallbackData?.audience || 'Target learners'],
      key_competencies: ['Core competencies'],
      content_outline: ['Module structure'],
      accessibility_and_inclusion: {
        standards: ['WCAG 2.2 AA'],
        notes: 'Ensure accessibility'
      }
    }
  } else {
    // Ensure arrays are present
    repaired.solution.delivery_modalities = repaired.solution.delivery_modalities || []
    repaired.solution.target_audiences = repaired.solution.target_audiences || []
    repaired.solution.key_competencies = repaired.solution.key_competencies || []
    repaired.solution.content_outline = repaired.solution.content_outline || []
    
    // Add at least one item if arrays are empty
    if (repaired.solution.delivery_modalities.length === 0) {
      repaired.solution.delivery_modalities.push({
        modality: 'Blended Learning',
        reason: 'Flexible approach',
        priority: 1
      })
    }
    if (repaired.solution.target_audiences.length === 0) {
      repaired.solution.target_audiences.push(fallbackData?.audience || 'Primary learners')
    }
    if (repaired.solution.key_competencies.length === 0) {
      repaired.solution.key_competencies.push('Core competencies')
    }
    if (repaired.solution.content_outline.length === 0) {
      repaired.solution.content_outline.push('Module 1: Foundations')
    }
  }
  
  // Ensure learner_analysis
  if (!repaired.learner_analysis) {
    repaired.learner_analysis = {
      profiles: [{
        segment: 'Primary',
        roles: ['Learner'],
        context: null,
        motivators: ['Growth'],
        constraints: ['Time']
      }],
      readiness_risks: []
    }
  }
  
  // Ensure technology_talent
  if (!repaired.technology_talent) {
    repaired.technology_talent = {
      technology: {
        current_stack: ['LMS'],
        gaps: [],
        recommendations: [],
        data_plan: { standards: [], integrations: [] }
      },
      talent: {
        available_roles: ['SME'],
        gaps: [],
        recommendations: []
      }
    }
  }
  
  // Ensure delivery_plan
  if (!repaired.delivery_plan) {
    repaired.delivery_plan = {
      phases: [{
        name: 'Discovery',
        duration_weeks: 2,
        goals: ['Requirements'],
        activities: ['Analysis']
      }],
      timeline: [],
      resources: []
    }
  }
  
  // Ensure measurement
  if (!repaired.measurement) {
    repaired.measurement = {
      success_metrics: [{
        metric: 'Completion',
        baseline: null,
        target: '85%',
        timeframe: fallbackData?.timeline?.end || '2025-12-31'
      }],
      assessment_strategy: [],
      data_sources: [],
      learning_analytics: { levels: [], reporting_cadence: null }
    }
  }
  
  // Ensure budget
  if (!repaired.budget) {
    repaired.budget = {
      currency: 'USD',
      notes: fallbackData?.budget || null,
      items: []
    }
  }
  
  // Ensure risks
  if (!Array.isArray(repaired.risks)) {
    repaired.risks = []
  }
  
  // Ensure next_steps
  if (!Array.isArray(repaired.next_steps)) {
    repaired.next_steps = ['Review and validate requirements']
  }
  
  return repaired as NAReport
}

/**
 * Safely extracts JSON from a string that may contain markdown or other text
 */
export function extractJsonFromText(text: string): string {
  // Remove hidden reasoning or preambles like <think>...</think>, <analysis>...</analysis>
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gmi, '')
  cleaned = cleaned.replace(/<analysis>[\s\S]*?<\/analysis>/gmi, '')
  // Then try to find JSON object boundaries
  const patterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/,
    /(\{[\s\S]*\})/
  ]
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const candidate = (match[1] || match[0]).trim()
      if (candidate.includes('{') && candidate.includes('}')) {
        return candidate
      }
    }
  }
  // Fallback: strip everything before first '{' and after last '}'
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1)
  }
  return cleaned.trim()
}

/**
 * Validates preliminary report markdown structure
 */
export function validatePreliminaryMarkdown(markdown: string): {
  valid: boolean
  missingSections: string[]
} {
  const requiredSections = [
    '## Executive Summary',
    '## Organization & Audience',
    '## Business Objectives & Requirements',
    '## Learning Transfer & Sustainment',
    '## Performance Support',
    '## Documentation',
    '## Delivery & Modalities',
    '## Systems, Data & Integration',
    '## Resourcing, Budget & Timeline',
    '## Risks & Change Readiness',
    '## Recommendations & Next Steps'
  ]
  
  const missingSections: string[] = []
  
  for (const section of requiredSections) {
    const pattern = new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (!pattern.test(markdown)) {
      missingSections.push(section)
    }
  }
  
  // Check for Business Objectives & Requirements subsections
  if (/## Business Objectives & Requirements/i.test(markdown)) {
    const subsections = [
      { pattern: /### Strategic Goals/i, name: '### Strategic Goals' },
      { pattern: /\*\*Target Audiences?:\*\*/i, name: '**Target Audiences:**' },
      { pattern: /\*\*Key Competencies:\*\*/i, name: '**Key Competencies:**' },
      { pattern: /\*\*Content Outline:\*\*/i, name: '**Content Outline:**' }
    ]
    
    for (const sub of subsections) {
      if (!sub.pattern.test(markdown)) {
        missingSections.push(sub.name)
      }
    }
  }
  
  return {
    valid: missingSections.length === 0,
    missingSections
  }
}

