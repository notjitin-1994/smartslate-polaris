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
    // Helpers for list parsing and normalization
    const isBullet = (l: string) => /^[-*+]\s+/.test(l)
    const getBullet = (l: string) => l.replace(/^[-*+]\s+/, '')
    const getCells = (l: string): string[] => {
      const parts = l.split('|').map(s => s.trim())
      while (parts.length && parts[0] === '') parts.shift()
      while (parts.length && parts[parts.length - 1] === '') parts.pop()
      return parts
    }

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()

      // Normalize headings (case-insensitive, any level ##+)
      if (/^#{2,}\s+/.test(line)) {
        const header = line.replace(/^#{1,6}\s+/, '').trim().toLowerCase()
        // Core sections
        if (/^executive\s+summary/.test(header)) { currentSection = 'summary'; currentSubSection = '' }
        else if (/^executive\s+(overview|brief)/.test(header)) { currentSection = 'summary'; currentSubSection = '' }
        else if (/^recommended\s+solution/.test(header)) { currentSection = 'solution'; currentSubSection = '' }
        else if (/^(solution|program)\s+(overview|design)/.test(header)) { currentSection = 'solution'; currentSubSection = '' }
        else if (/^(learner|learning)\s+(experience\s+)?design/.test(header)) { currentSection = 'learner_analysis'; currentSubSection = '' }
        else if (/^learner\s+analysis/.test(header)) { currentSection = 'learner_analysis'; currentSubSection = '' }
        else if (/^technology\s+(&|and)?\s+talent(\s+analysis)?/.test(header)) { currentSection = 'technology_talent'; currentSubSection = '' }
        else if (/^delivery\s+plan/.test(header)) { currentSection = 'delivery_plan'; currentSubSection = '' }
        else if (/^(implementation|rollout)\s+(plan|roadmap)/.test(header)) { currentSection = 'delivery_plan'; currentSubSection = '' }
        else if (/^measurement(\s+strategy)?/.test(header)) { currentSection = 'measurement'; currentSubSection = '' }
        else if (/^measurement\s*&\s*success/.test(header)) { currentSection = 'measurement'; currentSubSection = '' }
        else if (/^(evaluation|evaluation\s*&\s*metrics)/.test(header)) { currentSection = 'measurement'; currentSubSection = '' }
        else if (/^budget/.test(header)) { currentSection = 'budget'; currentSubSection = '' }
        else if (/^risk/.test(header)) { currentSection = 'risks'; currentSubSection = '' }
        else if (/^(risk\s+assessment|risk\s+mitigation)/.test(header)) { currentSection = 'risks'; currentSubSection = '' }
        else if (/^next\s+steps|^recommendations\s+for\s+success/.test(header)) { currentSection = 'next_steps'; currentSubSection = '' }
        else if (/^(action\s+plan|immediate\s+next\s+steps|recommendations)$/i.test(header)) { currentSection = 'next_steps'; currentSubSection = '' }
        // Final-report specific synonyms mapped to structured fields
        else if (/^audience\s+analysis|^target\s+audience/.test(header)) { currentSection = 'solution'; currentSubSection = 'target_audiences' }
        else if (/^delivery\s+approach/.test(header)) { currentSection = 'solution'; currentSubSection = 'delivery_modalities' }
        else if (/^competency\s+development\s+focus/.test(header)) { currentSection = 'solution'; currentSubSection = 'key_competencies' }
        else if (/^proposed\s+curriculum\s+structure/.test(header)) { currentSection = 'solution'; currentSubSection = 'content_outline' }
        else if (/^technology\s+considerations/.test(header)) { currentSection = 'technology_talent'; currentSubSection = 'tech_current' }
        else if (/^accessibility\s+implementation/.test(header)) { currentSection = 'solution'; currentSubSection = 'accessibility' }
        else if (/^implementation\s+roadmap/.test(header)) { currentSection = 'delivery_plan'; currentSubSection = 'phases' }
        continue
      }

      if (currentSection === 'summary') {
        if (line.startsWith('**Problem Statement:**')) {
          report.summary.problem_statement = line.replace('**Problem Statement:**', '').trim()
        } else if (line.startsWith('**Current State:**')) currentSubSection = 'current_state'
        else if (line.startsWith('**Root Causes:**')) currentSubSection = 'root_causes'
        else if (line.startsWith('**Objectives:**')) currentSubSection = 'objectives'
        else if (line.startsWith('**Assumptions:**')) currentSubSection = 'assumptions'
        else if (line.startsWith('**Unknowns:**')) currentSubSection = 'unknowns'
        else if (line.startsWith('**Confidence:**')) {
          // Parse confidence value (e.g., "**Confidence:** 0.75" or "**Confidence:** 75%")
          const confidenceText = line.replace('**Confidence:**', '').trim()
          const confidenceMatch = confidenceText.match(/([\d.]+)%?/)
          if (confidenceMatch) {
            let confidenceValue = parseFloat(confidenceMatch[1])
            // If it's a percentage (> 1), convert to decimal
            if (confidenceValue > 1) confidenceValue = confidenceValue / 100
            report.summary.confidence = confidenceValue
          }
        } else if (isBullet(line) && currentSubSection) {
          const item = getBullet(line)
          if (currentSubSection === 'current_state') report.summary.current_state.push(item)
          else if (currentSubSection === 'root_causes') report.summary.root_causes.push(item)
          else if (currentSubSection === 'objectives') report.summary.objectives.push(item)
          else if (currentSubSection === 'assumptions') report.summary.assumptions.push(item)
          else if (currentSubSection === 'unknowns') report.summary.unknowns.push(item)
        } else if (isBullet(line) && !currentSubSection) {
          // Bulleted lines under summary without a sub-label → treat as current state points
          report.summary.current_state.push(getBullet(line))
        } else if (line && !line.startsWith('#') && !line.startsWith('**')) {
          // Plain paragraph under Executive Summary → set as problem statement (first), then as current state
          const text = line
          if (!report.summary.problem_statement) report.summary.problem_statement = text
          else report.summary.current_state.push(text)
        }
      }

      if (currentSection === 'solution') {
        if (line.startsWith('### Delivery Modalities')) currentSubSection = 'delivery_modalities'
        else if (/^\*\*Target Audience(s)?:\*\*/i.test(line)) currentSubSection = 'target_audiences'
        else if (/^\*\*Key Competenc(y|ies):\*\*/i.test(line)) currentSubSection = 'key_competencies'
        else if (/^\*\*Content Outline:\*\*/i.test(line)) currentSubSection = 'content_outline'
        else if (isBullet(line)) {
          const item = getBullet(line)
          if (currentSubSection === 'delivery_modalities') {
            // Support modality parsing with first occurrence of ':', '—', '–', or '-' as delimiter
            const mm = item.match(/^(.+?)\s*[:\u2014\u2013-]\s*(.+)$/)
            const modalityClean = (mm?.[1] || item).replace(/\*\*/g, '').trim()
            const reason = (mm?.[2] || '').replace(/\*\*/g, '').trim()
            report.solution.delivery_modalities.push({ modality: modalityClean, reason, priority: report.solution.delivery_modalities.length + 1 })
          } else if (currentSubSection === 'target_audiences') report.solution.target_audiences.push(item)
          else if (currentSubSection === 'key_competencies') report.solution.key_competencies.push(item)
          else if (currentSubSection === 'content_outline') report.solution.content_outline.push(item)
          else if (currentSubSection === 'accessibility') {
            // Treat bullets as accessibility standards
            report.solution.accessibility_and_inclusion.standards.push(item)
          }
        }
      }

      if (currentSection === 'delivery_plan') {
        if (line.startsWith('### Timeline')) currentSubSection = 'timeline'
        else if (line.startsWith('### Resources')) currentSubSection = 'resources'
        else if (isBullet(line) && currentSubSection === 'timeline') {
          const lblDate = getBullet(line)
          // Match: **Label:** 2025-09-01 to 2025-09-21 (supports -, / and en/em dashes)
          const match = lblDate.match(/\*\*(.*?)\*\*:\s*([0-9/\-]+)\s*(?:to|–|—)\s*([0-9/\-]+)/)
          if (match) {
            report.delivery_plan.timeline.push({ label: match[1], start: match[2], end: match[3] })
          }
        } else if (isBullet(line) && currentSubSection === 'resources') {
          report.delivery_plan.resources.push(getBullet(line))
        } else if (line.startsWith('**') && line.includes('weeks')) {
          const match = line.match(/\*\*(.*?)\*\*.*?(\d+)\s+weeks/)
          if (match) {
            const phase = { name: match[1], duration_weeks: parseInt(match[2]), goals: [] as string[], activities: [] as string[] }
            for (let j = i + 1; j < lines.length && j < i + 10; j++) {
              const nextLine = lines[j].trim()
              if (nextLine === 'Goals:') {
                for (let k = j + 1; k < lines.length && /^[-*+]\s+/.test(lines[k]); k++) phase.goals.push(lines[k].replace(/^[-*+]\s+/, '').trim())
              } else if (nextLine === 'Activities:') {
                for (let k = j + 1; k < lines.length && /^[-*+]\s+/.test(lines[k]); k++) phase.activities.push(lines[k].replace(/^[-*+]\s+/, '').trim())
              }
              if (nextLine.startsWith('**') && j > i) break
            }
            report.delivery_plan.phases.push(phase)
          }
        } else if (isBullet(line) && currentSubSection === 'phases') {
          // From "Implementation Roadmap" bullets, record lightweight phases without durations
          const name = getBullet(line).trim()
          if (name) report.delivery_plan.phases.push({ name, duration_weeks: 0, goals: [], activities: [] })
        }
      }

      if (currentSection === 'measurement' || (currentSection === '' && /success\s+metrics/i.test(line))) {
        // Support both legacy bold labels and newer subheadings
        if (line.startsWith('**Success Metrics:**') || /^###\s+Success Metrics/i.test(line) || /^\*\*Measurement\*\*/.test(line)) {
          currentSection = 'measurement'
          currentSubSection = 'success_metrics'
        } else if (line.startsWith('**Assessment Strategy:**') || /^###\s+Assessment Strategy/i.test(line)) {
          currentSubSection = 'assessment_strategy'
        } else if (line.startsWith('**Data Sources:**') || /^###\s+Data Sources/i.test(line)) {
          currentSubSection = 'data_sources'
        } else if (line.startsWith('**Levels:**')) {
          currentSubSection = 'levels'
        } else if (/^\*\*Reporting Cadence:\*\*/.test(line)) {
          const cadence = line.replace(/^\*\*Reporting Cadence:\*\*/i, '').trim()
          report.measurement.learning_analytics.reporting_cadence = cadence || null
        } else if (isBullet(line)) {
          const item = getBullet(line).trim()
          if (currentSubSection === 'success_metrics') {
            // Parse various metric formats
            let metric = item
            let baseline: string | null = null
            let target = ''
            let timeframe = ''

            // Check for baseline in parentheses
            const baselineMatch = metric.match(/\(\s*Baseline:\s*([^\)]+)\)/i)
            if (baselineMatch) {
              baseline = baselineMatch[1].trim()
              metric = metric.replace(baselineMatch[0], '').trim()
            }

            // Check for arrow format (→ or ->) for target
            const arrowSplit = item.split(/[→\-]>\s*/)
            if (arrowSplit.length > 1) {
              metric = arrowSplit[0].replace(/[:\s]+$/, '').trim()
              const targetPart = arrowSplit[1]
              // Extract target and timeframe
              const targetMatch = targetPart.match(/Target:\s*([^\s]+)(?:\s+by\s+(.+))?/i)
              if (targetMatch) {
                target = targetMatch[1] || ''
                timeframe = targetMatch[2] || ''
              } else {
                // Simple format: metric → value
                target = targetPart.trim()
              }
            } else {
              // Check for colon format
              const colonSplit = item.split(':')
              if (colonSplit.length > 1) {
                metric = colonSplit[0].trim()
                const valuePart = colonSplit.slice(1).join(':').trim()
                // Try to extract target from the value
                const targetMatch = valuePart.match(/([\d]+%?)\s*(?:by\s+(.+))?/i)
                if (targetMatch) {
                  target = targetMatch[1] || valuePart
                  timeframe = targetMatch[2] || ''
                } else {
                  target = valuePart
                }
              }
              // Support "from X to Y by Z" pattern
              const fromToMatch = item.match(/from\s+([^\s]+)\s+to\s+([^\s]+)(?:\s+by\s+(.+))?/i)
              if (fromToMatch) {
                baseline = baseline || fromToMatch[1]
                target = fromToMatch[2]
                timeframe = fromToMatch[3] || timeframe
              }
            }

            // Clean up metric name
            metric = metric.replace(/[:\s\-→]+$/, '').trim()

            // Only add if we have at least a metric name
            if (metric) {
              report.measurement.success_metrics.push({ metric, baseline, target, timeframe })
            }
          } else if (currentSubSection === 'assessment_strategy' || /measurement\s+strategy/i.test(rawLine)) {
            report.measurement.assessment_strategy.push(item)
          } else if (currentSubSection === 'data_sources') {
            report.measurement.data_sources.push(item)
          } else if (currentSubSection === 'levels') {
            report.measurement.learning_analytics.levels.push(item)
          }
        }
      }

      if (currentSection === 'technology_talent') {
        // Handle Technology subsection
        if (/^###\s+Technology/.test(line)) {
          currentSubSection = 'technology'
        } else if (/^###\s+Talent/.test(line)) {
          currentSubSection = 'talent'
        } else if (line.startsWith('**Current Stack:**') || /^\*\*Available Technologies?:\*\*/i.test(line)) {
          currentSubSection = 'tech_current'
        } else if (line.startsWith('**Gaps:**') && currentSubSection.startsWith('tech')) {
          currentSubSection = 'tech_gaps'
        } else if (line.startsWith('**Recommendations:**') && currentSubSection.startsWith('tech')) {
          currentSubSection = 'tech_recommendations'
        } else if (line.startsWith('**Available Roles:**')) {
          currentSubSection = 'talent_available'
        } else if (line.startsWith('**Gaps:**') && currentSubSection.startsWith('talent')) {
          currentSubSection = 'talent_gaps'
        } else if (line.startsWith('**Recommendations:**') && currentSubSection.startsWith('talent')) {
          currentSubSection = 'talent_recommendations'
        } else if (isBullet(line)) {
          const item = getBullet(line).trim()
          if (currentSubSection === 'tech_current' || currentSubSection === 'technology') {
            report.technology_talent.technology.current_stack.push(item)
          } else if (currentSubSection === 'tech_gaps') {
            report.technology_talent.technology.gaps.push(item)
          } else if (currentSubSection === 'tech_recommendations') {
            // Try to parse as capability: fit format
            const capMatch = item.match(/^(.*?):\s*(.*)$/)
            if (capMatch) {
              report.technology_talent.technology.recommendations.push({
                capability: capMatch[1].trim(),
                fit: capMatch[2].trim(),
                constraints: []
              })
            } else {
              report.technology_talent.technology.recommendations.push({
                capability: item,
                fit: '',
                constraints: []
              })
            }
          } else if (currentSubSection === 'talent_available' || currentSubSection === 'talent') {
            report.technology_talent.talent.available_roles.push(item)
          } else if (currentSubSection === 'talent_gaps') {
            report.technology_talent.talent.gaps.push(item)
          } else if (currentSubSection === 'talent_recommendations') {
            report.technology_talent.talent.recommendations.push(item)
          }
        }
      }

      if (currentSection === 'learner_analysis') {
        if (/^###\s+Learner Profile/.test(line)) {
          currentSubSection = 'profiles'
        } else if (/^###\s+Readiness Risks/.test(line)) {
          currentSubSection = 'readiness_risks'
        } else if (/^\*\*Learner Profiles?:\*\*/i.test(line)) {
          currentSubSection = 'profiles'
        } else if (/^\*\*Readiness Risks?:\*\*/i.test(line)) {
          currentSubSection = 'readiness_risks'
        } else if (line.startsWith('**') && line.includes(':')) {
          // Handle profile attributes
          const match = line.match(/\*\*(.*?):\*\*\s*(.*)/)
          if (match && report.learner_analysis.profiles.length > 0) {
            const lastProfile = report.learner_analysis.profiles[report.learner_analysis.profiles.length - 1]
            const key = match[1].toLowerCase()
            const value = match[2]
            if (key.includes('segment')) lastProfile.segment = value
            else if (key.includes('role')) lastProfile.roles = value.split(',').map(r => r.trim())
            else if (key.includes('context')) lastProfile.context = value
            else if (key.includes('motivator')) lastProfile.motivators = value.split(',').map(m => m.trim())
            else if (key.includes('constraint')) lastProfile.constraints = value.split(',').map(c => c.trim())
          }
        } else if (isBullet(line)) {
          const item = getBullet(line).trim()
          if (currentSubSection === 'readiness_risks') {
            report.learner_analysis.readiness_risks.push(item)
          } else if (currentSubSection === 'profiles' && !report.learner_analysis.profiles.length) {
            // Create a default profile if none exists
            report.learner_analysis.profiles.push({
              segment: item,
              roles: [],
              context: null,
              motivators: [],
              constraints: []
            })
          }
        }
      }

      if (currentSection === 'next_steps') {
        const match = line.match(/^\d+\.\s+(.*)/)
        if (match) report.next_steps.push(match[1])
        else if (isBullet(line)) report.next_steps.push(getBullet(line).trim())
      }

      // Parse risk tables under the Risks section
      if (currentSection === 'risks' && line.includes('|')) {
        const header = line
        const divider = lines[i + 1]
        const isDivider = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider || '')
        if (isDivider) {
          const headers = getCells(header).map(h => h.toLowerCase())
          i += 2
          while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
            const cells = getCells(lines[i])
            const idx = (name: string) => headers.findIndex(h => h.startsWith(name))
            const get = (name: string) => { const j = idx(name); return j >= 0 ? (cells[j] || '') : '' }
            const riskText = get('risk') || cells[0] || ''
            const mitigation = get('mitigation') || get('mitigation strategy') || get('contingency') || ''
            const sevRaw = (get('severity') || get('impact')).toLowerCase()
            const probRaw = (get('probability') || '').toLowerCase()
            const level = (v: string): 'low'|'medium'|'high' => /critical|high|5|4/.test(v) ? 'high' : /low|1|2/.test(v) ? 'low' : 'medium'
            if (riskText) {
              report.risks.push({ risk: riskText, mitigation, severity: level(sevRaw), likelihood: level(probRaw) })
            }
            i++
          }
          i--
          continue
        }
      }

      if (currentSection === 'risks' && isBullet(line)) {
        const inner = getBullet(line).trim()
        // Inline "Risk ... Mitigation ..." on one bullet
        const inlineMatch = inner.match(/\*\*Risk:\*\*\s*(.*?)\s*(?:\||—|–|-)\s*\*\*Mitigation:\*\*\s*(.*)/)
        if (inlineMatch) {
          report.risks.push({ risk: inlineMatch[1], mitigation: inlineMatch[2], severity: 'medium', likelihood: 'medium' })
        } else if (inner.startsWith('**Risk:**')) {
          const riskMatch = inner.match(/\*\*Risk:\*\*\s*(.*?)$/)
          const mitigationLine = lines[i + 1]?.trim()
          const mitigationMatch = mitigationLine?.match(/\*\*Mitigation:\*\*\s*(.*?)$/)
          if (riskMatch && mitigationMatch) report.risks.push({ risk: riskMatch[1], mitigation: mitigationMatch[1], severity: 'medium', likelihood: 'medium' })
        }
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

  const sections: string[] = ['Executive Summary', 'Organization & Audience']
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


