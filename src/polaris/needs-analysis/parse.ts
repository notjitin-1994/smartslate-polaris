// src/polaris/needs-analysis/parse.ts
import type { NAReport } from './report'

// Lightweight, UI-friendly parser used across report views and cards
export function parseMarkdownToReport(markdown: string): NAReport | null {
  try {
    const report: NAReport = {
      summary: {
        problem_statement: '',
        current_state: [],
        root_causes: [],
        objectives: [],
        assumptions: [],
        unknowns: [],
        confidence: 0.5,
      },
      solution: {
        delivery_modalities: [],
        target_audiences: [],
        key_competencies: [],
        content_outline: [],
        accessibility_and_inclusion: { standards: [], notes: null },
      },
      learner_analysis: {
        profiles: [],
        readiness_risks: [],
      },
      technology_talent: {
        technology: {
          current_stack: [],
          gaps: [],
          recommendations: [],
          data_plan: { standards: [], integrations: [] },
        },
        talent: {
          available_roles: [],
          gaps: [],
          recommendations: [],
        },
      },
      delivery_plan: {
        phases: [],
        timeline: [],
        resources: [],
      },
      measurement: {
        success_metrics: [],
        assessment_strategy: [],
        data_sources: [],
        learning_analytics: { levels: [], reporting_cadence: null },
      },
      budget: {
        currency: 'USD',
        notes: null,
        items: [],
      },
      risks: [],
      next_steps: [],
    }

    const lines = markdown.split('\n')
    let currentSection = ''
    let currentSubSection = ''

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()

      if (line.startsWith('## Executive Summary')) currentSection = 'summary'
      else if (line.startsWith('## Recommended Solution')) currentSection = 'solution'
      else if (line.startsWith('## Delivery Plan')) currentSection = 'delivery_plan'
      else if (line.startsWith('## Measurement')) currentSection = 'measurement'
      else if (line.startsWith('## Budget')) currentSection = 'budget'
      else if (line.startsWith('## Risk')) currentSection = 'risks'
      else if (line.startsWith('## Next Steps')) currentSection = 'next_steps'

      if (currentSection === 'summary') {
        if (line.startsWith('**Problem Statement:**')) {
          report.summary.problem_statement = line.replace('**Problem Statement:**', '').trim()
        } else if (line.startsWith('**Current State:**')) currentSubSection = 'current_state'
        else if (line.startsWith('**Root Causes:**')) currentSubSection = 'root_causes'
        else if (line.startsWith('**Objectives:**')) currentSubSection = 'objectives'
        else if (line.startsWith('- ') && currentSubSection) {
          const item = line.substring(2)
          if (currentSubSection === 'current_state') report.summary.current_state.push(item)
          else if (currentSubSection === 'root_causes') report.summary.root_causes.push(item)
          else if (currentSubSection === 'objectives') report.summary.objectives.push(item)
        }
      }

      if (currentSection === 'solution') {
        if (line.startsWith('### Delivery Modalities')) currentSubSection = 'delivery_modalities'
        else if (/^\*\*Target Audience(s)?:\*\*/i.test(line)) currentSubSection = 'target_audiences'
        else if (/^\*\*Key Competenc(y|ies):\*\*/i.test(line)) currentSubSection = 'key_competencies'
        else if (/^\*\*Content Outline:\*\*/i.test(line)) currentSubSection = 'content_outline'
        else if (line.startsWith('- ')) {
          const item = line.substring(2)
          if (currentSubSection === 'delivery_modalities' && item.includes(':')) {
            const [modality, reasonRaw] = item.split(':')
            const modalityClean = modality.replace(/\*\*/g, '').trim()
            const reason = reasonRaw?.replace(/\*\*/g, '').trim() || ''
            report.solution.delivery_modalities.push({ modality: modalityClean, reason, priority: report.solution.delivery_modalities.length + 1 })
          } else if (currentSubSection === 'target_audiences') report.solution.target_audiences.push(item)
          else if (currentSubSection === 'key_competencies') report.solution.key_competencies.push(item)
          else if (currentSubSection === 'content_outline') report.solution.content_outline.push(item)
        }
      }

      if (currentSection === 'delivery_plan') {
        if (line.startsWith('### Timeline')) currentSubSection = 'timeline'
        else if (line.startsWith('### Resources')) currentSubSection = 'resources'
        else if (line.startsWith('- ') && currentSubSection === 'timeline') {
          const match = line.match(/\*\*(.*?)\*\*:\s*([\d-]+)\s+to\s+([\d-]+)/)
          if (match) {
            report.delivery_plan.timeline.push({ label: match[1], start: match[2], end: match[3] })
          }
        } else if (line.startsWith('- ') && currentSubSection === 'resources') {
          report.delivery_plan.resources.push(line.substring(2))
        } else if (line.startsWith('**') && line.includes('weeks')) {
          const match = line.match(/\*\*(.*?)\*\*.*?(\d+)\s+weeks/)
          if (match) {
            const phase = { name: match[1], duration_weeks: parseInt(match[2]), goals: [] as string[], activities: [] as string[] }
            for (let j = i + 1; j < lines.length && j < i + 10; j++) {
              const nextLine = lines[j].trim()
              if (nextLine === 'Goals:') {
                for (let k = j + 1; k < lines.length && lines[k].startsWith('- '); k++) phase.goals.push(lines[k].substring(2).trim())
              } else if (nextLine === 'Activities:') {
                for (let k = j + 1; k < lines.length && lines[k].startsWith('- '); k++) phase.activities.push(lines[k].substring(2).trim())
              }
              if (nextLine.startsWith('**') && j > i) break
            }
            report.delivery_plan.phases.push(phase)
          }
        }
      }

      if (currentSection === 'measurement') {
        if (line.startsWith('**Success Metrics:**')) currentSubSection = 'success_metrics'
        else if (line.startsWith('**Assessment Strategy:**')) currentSubSection = 'assessment_strategy'
        else if (line.startsWith('**Data Sources:**')) currentSubSection = 'data_sources'
        else if (line.startsWith('- ')) {
          const item = line.substring(2)
          if (currentSubSection === 'success_metrics') report.measurement.success_metrics.push({ metric: item, baseline: null, target: '', timeframe: '' })
          else if (currentSubSection === 'assessment_strategy') report.measurement.assessment_strategy.push(item)
          else if (currentSubSection === 'data_sources') report.measurement.data_sources.push(item)
        }
      }

      if (currentSection === 'next_steps') {
        const match = line.match(/^\d+\.\s+(.*)/)
        if (match) report.next_steps.push(match[1])
      }

      if (currentSection === 'risks' && line.startsWith('- **Risk:**')) {
        const riskMatch = line.match(/\*\*Risk:\*\*\s*(.*?)$/)
        const mitigationLine = lines[i + 1]?.trim()
        const mitigationMatch = mitigationLine?.match(/\*\*Mitigation:\*\*\s*(.*?)$/)
        if (riskMatch && mitigationMatch) report.risks.push({ risk: riskMatch[1], mitigation: mitigationMatch[1], severity: 'medium', likelihood: 'medium' })
      }
    }

    return report
  } catch (error) {
    console.error('Failed to parse markdown to report:', error)
    return null
  }
}

export type InThisReportInfo = {
  sections: string[]
  counts: {
    modalities: number
    objectives: number
    phases: number
    metrics: number
    risks: number
  }
  problemStatement?: string
}

export function extractInThisReportInfo(markdown: string): InThisReportInfo | null {
  const report = parseMarkdownToReport(markdown)
  if (!report) return null

  const sections: string[] = ['Executive Summary', 'Recommended Solution']
  if (report.delivery_plan.phases.length > 0 || report.delivery_plan.timeline.length > 0) sections.push('Delivery Plan')
  if (report.measurement.success_metrics.length > 0) sections.push('Measurement')
  if (report.budget.items.length > 0 || report.budget.notes) sections.push('Budget')
  if (report.risks.length > 0) sections.push('Risks')
  if (report.next_steps.length > 0) sections.push('Next Steps')

  return {
    sections,
    counts: {
      modalities: report.solution.delivery_modalities.length,
      objectives: report.summary.objectives.length,
      phases: report.delivery_plan.phases.length,
      metrics: report.measurement.success_metrics.length,
      risks: report.risks.length,
    },
    problemStatement: report.summary.problem_statement || undefined,
  }
}


