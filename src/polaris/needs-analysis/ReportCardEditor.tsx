import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import type { NAReport } from '@/polaris/needs-analysis/report'

type ReportCardEditorProps = {
  markdown: string
  onChange: (markdown: string) => void
  className?: string
}

// Minimal icon set aligned with ReportDisplay
function Icon({ name, className = 'w-4 h-4' }: { name: 'summary' | 'solution' | 'delivery' | 'metrics' | 'timeline' | 'risks' | 'audience' | 'modality' | 'tech' | 'assessment'; className?: string }) {
  switch (name) {
    case 'summary':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>
      )
    case 'solution':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .65.38 1.24 1 1.51.57.26 1.25.15 1.72-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.48.48-.59 1.16-.33 1.72.27.62.86 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.65 0-1.24.38-1.51 1z"/></svg>
      )
    case 'delivery':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h13v13H3z"/><path d="M16 8h5l-3-3h-2z"/></svg>
      )
    case 'metrics':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/></svg>
      )
    case 'timeline':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>
      )
    case 'risks':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      )
    case 'audience':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 1 0-7 2m-7 7v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1"/></svg>
      )
    case 'modality':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/></svg>
      )
    case 'tech':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 20h10"/></svg>
      )
    case 'assessment':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      )
    default:
      return null
  }
}

// Global toolbar that targets current selection in any contentEditable.
function GlobalToolbar() {
  const exec = (command: string, value?: string) => {
    try {
      document.execCommand(command, false, value)
    } catch {}
  }
  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) exec('createLink', url)
  }
  return (
    <div className="sticky top-16 z-30 bg-[rgb(var(--bg))]/75 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="text-sm font-medium text-white/80 mr-1">Edit</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 mr-3 px-2 py-1 rounded-xl border border-white/10 bg-white/5">
            <button type="button" className="icon-btn icon-btn-sm" title="Bold" onClick={() => exec('bold')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 5h6a3 3 0 010 6H7zM7 11h7a3 3 0 010 6H7z"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Italic" onClick={() => exec('italic')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Underline" onClick={() => exec('underline')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v6a6 6 0 0012 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
            </button>
          </div>
          <div className="w-px h-6 bg-white/15" />
          <div className="flex items-center gap-1 mr-3 px-2 py-1 rounded-xl border border-white/10 bg-white/5">
            <button type="button" className="icon-btn icon-btn-sm" title="Bulleted list" onClick={() => exec('insertUnorderedList')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Numbered list" onClick={() => exec('insertOrderedList')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><text x="3" y="7" fontSize="6" fill="currentColor">1</text><text x="3" y="13" fontSize="6" fill="currentColor">2</text><text x="3" y="19" fontSize="6" fill="currentColor">3</text></svg>
            </button>
          </div>
          <div className="w-px h-6 bg-white/15" />
          <div className="flex items-center gap-1 mr-3 px-2 py-1 rounded-xl border border-white/10 bg-white/5">
            <button type="button" className="icon-btn icon-btn-sm" title="Align left" onClick={() => exec('justifyLeft')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="14" y2="10"/><line x1="4" y1="14" x2="18" y2="14"/><line x1="4" y1="18" x2="12" y2="18"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Align center" onClick={() => exec('justifyCenter')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="6" x2="18" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Align right" onClick={() => exec('justifyRight')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="10" y1="10" x2="20" y2="10"/><line x1="6" y1="14" x2="20" y2="14"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Justify" onClick={() => exec('justifyFull')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
            </button>
          </div>
          <div className="w-px h-6 bg-white/15" />
          <div className="flex items-center gap-1 mr-3 px-2 py-1 rounded-xl border border-white/10 bg-white/5">
            <button type="button" className="icon-btn icon-btn-sm" title="Add link" onClick={addLink}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 13.5L13.5 10.5"/><path d="M7 17a4 4 0 010-5.66l2-2A4 4 0 0115 12"/><path d="M17 7a4 4 0 010 5.66l-2 2A4 4 0 019 12"/></svg>
            </button>
            <button type="button" className="icon-btn icon-btn-sm" title="Clear formatting" onClick={() => exec('removeFormat')}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility: deep clone NAReport to avoid mutations
function cloneReport(r: NAReport): NAReport {
  return JSON.parse(JSON.stringify(r)) as NAReport
}

// Local formatter to convert NAReport back to markdown (aligned with PolarisRevamped)
function formatReportAsMarkdown(report: NAReport): string {
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

// Editable contentEditable helper
function EditableText({ value, onChange, placeholder = '' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      try { ref.current.innerText = value } catch {}
    }
  }, [value])
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange((e.target as HTMLDivElement).innerText)}
      className="min-h-[32px] px-2 py-1 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary-400 text-sm text-white/90"
      data-placeholder={placeholder}
    />
  )
}

function ArrayEditor({ items, onChange, label, placeholder = 'Add item' }: { items: string[]; onChange: (items: string[]) => void; label: string; placeholder?: string }) {
  const updateItem = (idx: number, next: string) => {
    const copy = items.slice()
    copy[idx] = next
    onChange(copy)
  }
  const removeItem = (idx: number) => {
    const copy = items.slice()
    copy.splice(idx, 1)
    onChange(copy)
  }
  const addItem = () => onChange([...(items || []), ''])
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-white/70">{label}</div>
      <div className="space-y-2">
        {items?.map((it, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <EditableText value={it} onChange={(v) => updateItem(idx, v)} placeholder={placeholder} />
            <button type="button" className="icon-btn icon-btn-sm" title="Remove" onClick={() => removeItem(idx)}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost btn-sm" onClick={addItem}>Add</button>
    </div>
  )
}

export default function ReportCardEditor({ markdown, onChange, className = '' }: ReportCardEditorProps) {
  const parsed = useMemo(() => parseMarkdownToReport(markdown), [markdown])
  const [report, setReport] = useState<NAReport | null>(parsed)

  useEffect(() => { setReport(parsed) }, [parsed])

  const pushChange = useCallback((next: NAReport) => {
    setReport(next)
    try { onChange(formatReportAsMarkdown(next)) } catch {}
  }, [onChange])

  if (!report) {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${className}`}>
        <div className="text-white/60">No report to edit</div>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      <GlobalToolbar />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary-500/20"><Icon name="summary" className="w-4 h-4 text-primary-400" /></div>
                  <h3 className="text-lg font-semibold text-white/90">Executive Summary</h3>
                </div>
              </div>
              <div className="space-y-4 text-sm text-white/85">
                <div>
                  <div className="font-medium text-white/80 mb-1">Problem Statement</div>
                  <EditableText
                    value={report.summary.problem_statement || ''}
                    onChange={(v) => { const next = cloneReport(report); next.summary.problem_statement = v; pushChange(next) }}
                    placeholder="State the core problem"
                  />
                </div>
                <ArrayEditor
                  items={report.summary.current_state || []}
                  onChange={(arr) => { const next = cloneReport(report); next.summary.current_state = arr; pushChange(next) }}
                  label="Current State"
                  placeholder="Add a bullet"
                />
                <ArrayEditor
                  items={report.summary.root_causes || []}
                  onChange={(arr) => { const next = cloneReport(report); next.summary.root_causes = arr; pushChange(next) }}
                  label="Root Causes"
                />
                <ArrayEditor
                  items={report.summary.objectives || []}
                  onChange={(arr) => { const next = cloneReport(report); next.summary.objectives = arr; pushChange(next) }}
                  label="Objectives"
                />
              </div>
            </div>

            {/* Recommended Solutions */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-secondary-500/20"><Icon name="solution" className="w-4 h-4 text-secondary-400" /></div>
                <h3 className="text-lg font-semibold text-white/90">Business Objectives & Requirements</h3>
              </div>
              <div className="space-y-3">
                {(report.solution.delivery_modalities || []).map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-4">
                        <div className="text-xs text-white/60 mb-1">Modality</div>
                        <EditableText value={m.modality} onChange={(v) => { const next = cloneReport(report); next.solution.delivery_modalities[idx].modality = v; pushChange(next) }} />
                      </div>
                      <div className="col-span-12 md:col-span-7">
                        <div className="text-xs text-white/60 mb-1">Reason</div>
                        <EditableText value={m.reason} onChange={(v) => { const next = cloneReport(report); next.solution.delivery_modalities[idx].reason = v; pushChange(next) }} />
                      </div>
                      <div className="col-span-12 md:col-span-1">
                        <div className="text-xs text-white/60 mb-1">P</div>
                        <input
                          type="number"
                          min={1}
                          className="input text-sm w-full"
                          value={m.priority ?? 1}
                          onChange={(e) => { const next = cloneReport(report); next.solution.delivery_modalities[idx].priority = parseInt(e.target.value || '1'); pushChange(next) }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); next.solution.delivery_modalities.splice(idx, 1); pushChange(next) }}>Remove</button>
                      {idx > 0 && (
                        <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); const t = next.solution.delivery_modalities[idx]; next.solution.delivery_modalities.splice(idx, 1); next.solution.delivery_modalities.splice(idx - 1, 0, t); pushChange(next) }}>Move up</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-sm" onClick={() => { const next = cloneReport(report); next.solution.delivery_modalities.push({ modality: '', reason: '', priority: (next.solution.delivery_modalities?.length || 0) + 1 }); pushChange(next) }}>Add modality</button>
              </div>
            </div>

            {/* Delivery Plan */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-emerald-500/20"><Icon name="delivery" className="w-4 h-4 text-emerald-400" /></div>
                <h3 className="text-lg font-semibold text-white/90">Delivery Plan</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-white/80 mb-2">Phases</div>
                  <div className="space-y-3">
                    {(report.delivery_plan.phases || []).map((p, idx) => (
                      <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 md:col-span-6">
                            <div className="text-xs text-white/60 mb-1">Name</div>
                            <EditableText value={p.name} onChange={(v) => { const next = cloneReport(report); next.delivery_plan.phases[idx].name = v; pushChange(next) }} />
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <div className="text-xs text-white/60 mb-1">Duration (weeks)</div>
                            <input type="number" min={1} className="input text-sm w-full" value={p.duration_weeks} onChange={(e) => { const next = cloneReport(report); next.delivery_plan.phases[idx].duration_weeks = parseInt(e.target.value || '0'); pushChange(next) }} />
                          </div>
                        </div>
                        <ArrayEditor items={p.goals || []} onChange={(arr) => { const next = cloneReport(report); next.delivery_plan.phases[idx].goals = arr; pushChange(next) }} label="Goals" />
                        <ArrayEditor items={p.activities || []} onChange={(arr) => { const next = cloneReport(report); next.delivery_plan.phases[idx].activities = arr; pushChange(next) }} label="Activities" />
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); next.delivery_plan.phases.splice(idx, 1); pushChange(next) }}>Remove</button>
                          {idx > 0 && (
                            <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); const t = next.delivery_plan.phases[idx]; next.delivery_plan.phases.splice(idx, 1); next.delivery_plan.phases.splice(idx - 1, 0, t); pushChange(next) }}>Move up</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => { const next = cloneReport(report); next.delivery_plan.phases.push({ name: '', duration_weeks: 1, goals: [], activities: [] }); pushChange(next) }}>Add phase</button>
                </div>

                <div>
                  <div className="text-sm font-medium text-white/80 mb-2">Timeline</div>
                  <div className="space-y-2">
                    {(report.delivery_plan.timeline || []).map((t, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <div className="text-xs text-white/60 mb-1">Label</div>
                          <EditableText value={t.label} onChange={(v) => { const next = cloneReport(report); next.delivery_plan.timeline[idx].label = v; pushChange(next) }} />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <div className="text-xs text-white/60 mb-1">Start</div>
                          <input type="date" className="input text-sm w-full" value={t.start || ''} onChange={(e) => { const next = cloneReport(report); next.delivery_plan.timeline[idx].start = e.target.value; pushChange(next) }} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <div className="text-xs text-white/60 mb-1">End</div>
                          <input type="date" className="input text-sm w-full" value={t.end || ''} onChange={(e) => { const next = cloneReport(report); next.delivery_plan.timeline[idx].end = e.target.value; pushChange(next) }} />
                        </div>
                        <div className="col-span-12 md:col-span-1">
                          <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); next.delivery_plan.timeline.splice(idx, 1); pushChange(next) }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => { const next = cloneReport(report); next.delivery_plan.timeline.push({ label: '', start: '', end: '' }); pushChange(next) }}>Add milestone</button>
                </div>

                <ArrayEditor
                  items={report.delivery_plan.resources || []}
                  onChange={(arr) => { const next = cloneReport(report); next.delivery_plan.resources = arr; pushChange(next) }}
                  label="Resources Needed"
                />
              </div>
            </div>

            {/* Success Metrics */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-blue-500/20"><Icon name="metrics" className="w-4 h-4 text-blue-400" /></div>
                <h3 className="text-lg font-semibold text-white/90">Success Metrics</h3>
              </div>
              <div className="space-y-3">
                {(report.measurement.success_metrics || []).map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-xs text-white/60 mb-1">Metric</div>
                      <EditableText value={m.metric} onChange={(v) => { const next = cloneReport(report); next.measurement.success_metrics[idx].metric = v; pushChange(next) }} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <div className="text-xs text-white/60 mb-1">Baseline</div>
                      <input className="input text-sm w-full" value={m.baseline || ''} onChange={(e) => { const next = cloneReport(report); next.measurement.success_metrics[idx].baseline = e.target.value || null; pushChange(next) }} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <div className="text-xs text-white/60 mb-1">Target</div>
                      <input className="input text-sm w-full" value={m.target} onChange={(e) => { const next = cloneReport(report); next.measurement.success_metrics[idx].target = e.target.value; pushChange(next) }} />
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <div className="text-xs text-white/60 mb-1">By</div>
                      <input type="date" className="input text-sm w-full" value={m.timeframe || ''} onChange={(e) => { const next = cloneReport(report); next.measurement.success_metrics[idx].timeframe = e.target.value; pushChange(next) }} />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); next.measurement.success_metrics.splice(idx, 1); pushChange(next) }}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-sm" onClick={() => { const next = cloneReport(report); next.measurement.success_metrics.push({ metric: '', baseline: null, target: '', timeframe: '' }); pushChange(next) }}>Add metric</button>
              </div>
            </div>

            {/* Risks */}
            <div className="glass-card p-5 border-l-4 border-l-red-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-red-500/20"><Icon name="risks" className="w-4 h-4 text-red-400" /></div>
                <h4 className="text-sm font-semibold text-white/90">Risks & Change Readiness</h4>
              </div>
              <div className="space-y-3">
                {(report.risks || []).map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-xs text-white/60 mb-1">Risk</div>
                      <EditableText value={r.risk} onChange={(v) => { const next = cloneReport(report); next.risks[idx].risk = v; pushChange(next) }} />
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-xs text-white/60 mb-1">Mitigation</div>
                      <EditableText value={r.mitigation} onChange={(v) => { const next = cloneReport(report); next.risks[idx].mitigation = v; pushChange(next) }} />
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <div className="text-xs text-white/60 mb-1">Severity</div>
                      <select className="brand-select w-full" value={r.severity} onChange={(e) => { const next = cloneReport(report); next.risks[idx].severity = e.target.value as any; pushChange(next) }}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <div className="text-xs text-white/60 mb-1">Likelihood</div>
                      <select className="brand-select w-full" value={r.likelihood} onChange={(e) => { const next = cloneReport(report); next.risks[idx].likelihood = e.target.value as any; pushChange(next) }}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-12">
                      <button type="button" className="btn-ghost btn-xs" onClick={() => { const next = cloneReport(report); next.risks.splice(idx, 1); pushChange(next) }}>Remove</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-sm" onClick={() => { const next = cloneReport(report); next.risks.push({ risk: '', mitigation: '', severity: 'medium', likelihood: 'medium' }); pushChange(next) }}>Add risk</button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-purple-500/20"><Icon name="audience" className="w-4 h-4 text-purple-400" /></div>
                <h4 className="text-sm font-semibold text-white/90">Target Audience</h4>
              </div>
              <ArrayEditor
                items={report.solution.target_audiences || []}
                onChange={(arr) => { const next = cloneReport(report); next.solution.target_audiences = arr; pushChange(next) }}
                label="Audiences"
              />
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-indigo-500/20"><Icon name="modality" className="w-4 h-4 text-indigo-400" /></div>
                <h4 className="text-sm font-semibold text-white/90">Learning Modalities</h4>
              </div>
              <div className="text-xs text-white/60 mb-2">Mirror of modalities (edit above)</div>
              <div className="space-y-2">
                {(report.solution.delivery_modalities || []).map((m, idx) => (
                  <div key={idx} className="rounded border border-white/10 bg-white/5 p-2">
                    <div className="font-medium text-white/85">{m.modality || '—'}</div>
                    <div className="text-white/70 text-xs">{m.reason || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-cyan-500/20"><Icon name="tech" className="w-4 h-4 text-cyan-400" /></div>
                <h4 className="text-sm font-semibold text-white/90">Technology Stack</h4>
              </div>
              <ArrayEditor
                items={report.technology_talent.technology.current_stack || []}
                onChange={(arr) => { const next = cloneReport(report); next.technology_talent.technology.current_stack = arr; pushChange(next) }}
                label="Current Stack"
              />
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-orange-500/20"><Icon name="assessment" className="w-4 h-4 text-orange-400" /></div>
                <h4 className="text-sm font-semibold text-white/90">Assessment Strategy</h4>
              </div>
              <ArrayEditor
                items={report.measurement.assessment_strategy || []}
                onChange={(arr) => { const next = cloneReport(report); next.measurement.assessment_strategy = arr; pushChange(next) }}
                label="Methods"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


