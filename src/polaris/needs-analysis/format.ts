import type { NAReport } from './report'
import { tryExtractJson } from './json'

export function formatReportAsMarkdown(report: NAReport): string {
  let md = '# Learning & Development Starmap Report\n\n'
  if (report.summary) {
    md += '## Executive Summary\n\n'
    if (report.summary.problem_statement) md += `**Problem Statement:** ${report.summary.problem_statement}\n\n`
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

  if (report.solution) {
    md += '\n## Business Objectives & Requirements\n\n'
    if (report.solution.delivery_modalities?.length) {
      md += '### Delivery Modalities\n'
      report.solution.delivery_modalities.forEach(m => {
        if (m?.modality && m?.reason) md += `- **${m.modality} (P${m.priority ?? 1})**: ${m.reason}\n`
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

  if (report.technology_talent) {
    md += '\n## Technology & Talent Analysis\n\n'
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
        if (t?.label && t?.start && t?.end) md += `- **${t.label}:** ${t.start} to ${t.end}\n`
      })
    }
    if (report.delivery_plan.resources?.length) {
      md += '\n### Resources Needed\n'
      report.delivery_plan.resources.forEach(r => md += `- ${r}\n`)
    }
  }

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

  if (report.budget) {
    md += '\n## Budget\n\n'
    md += `**Currency:** ${report.budget.currency || 'USD'}\n`
    if (report.budget.notes) md += `\nNotes: ${report.budget.notes}\n`
    if (report.budget.items?.length) {
      report.budget.items.forEach(b => { md += `- **${b.item}:** ${b.low} - ${b.high}\n` })
    }
  }

  if (report.risks?.length) {
    md += '\n## Risk Mitigation\n\n'
    report.risks.forEach(r => { if (r?.risk && r?.mitigation) md += `- **Risk:** ${r.risk}\n  **Mitigation:** ${r.mitigation}\n` })
  }

  if (report.next_steps?.length) {
    md += '\n## Next Steps\n\n'
    report.next_steps.forEach((s: string, i: number) => md += `${i + 1}. ${s}\n`)
  }

  return md
}

export function convertNaJsonStringToMarkdown(input: string): string | null {
  try {
    const json = JSON.parse(tryExtractJson(input)) as NAReport
    if (json && typeof json === 'object' && json.summary && json.solution) {
      return formatReportAsMarkdown(json)
    }
    return null
  } catch {
    return null
  }
}


