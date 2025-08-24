// src/polaris/needs-analysis/ReportDisplay.tsx
// Note: type imported where needed in shared parser; unused here
import { useState, type ReactNode } from 'react'
import { parseMarkdownToReport } from './parse'

interface ReportDisplayProps {
  reportMarkdown: string
  reportTitle?: string
  editableTitle?: boolean
  savingTitle?: boolean
  onSaveTitle?: (newTitle: string) => void | Promise<void>
  className?: string
}

// (parser moved to shared module: ./parse)

export default function ReportDisplay({ reportMarkdown, reportTitle, editableTitle = false, savingTitle = false, onSaveTitle, className = '' }: ReportDisplayProps) {
  const report = parseMarkdownToReport(reportMarkdown)
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [titleInput, setTitleInput] = useState<string>(reportTitle || 'Needs Analysis Report')
  
  // Simple inline icon set (stroke-current), sized via className
  function Icon({ name, className = 'w-4 h-4' }: { name: 'summary' | 'solution' | 'delivery' | 'metrics' | 'timeline' | 'steps' | 'risks' | 'audience' | 'modality' | 'tech' | 'doc' | 'blend' | 'online' | 'workshop' | 'coach' | 'toolbox' | 'check' | 'database' | 'assessment' | 'target'; className?: string }) {
    switch (name) {
      case 'summary':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/></svg>
        )
      case 'solution':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M5.22 5.22 8 8"/><path d="M2 12h4"/><path d="M5.22 18.78 8 16"/><path d="M12 22v-4"/><path d="M18.78 18.78 16 16"/><path d="M22 12h-4"/><path d="M18.78 5.22 16 8"/><circle cx="12" cy="12" r="3"/></svg>
        )
      case 'delivery':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v6H3z"/><path d="M3 9l3 12h12l3-12"/><path d="M9 12h6"/></svg>
        )
      case 'metrics':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15v3"/><path d="M11 11v7"/><path d="M15 7v11"/><path d="M19 12v6"/></svg>
        )
      case 'timeline':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><circle cx="7" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="17" cy="12" r="2"/></svg>
        )
      case 'steps':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21V9h4v12"/><path d="M13 21V3h4v18"/></svg>
        )
      case 'risks':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        )
      case 'audience':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        )
      case 'modality':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/></svg>
        )
      case 'tech':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.28 1.35.78 1.82.5.47 1.18.73 1.87.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        )
      case 'blend':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 14v6"/></svg>
        )
      case 'online':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M12 8v4l3 2"/></svg>
        )
      case 'workshop':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18"/><path d="M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"/><path d="M7 7l5-4 5 4"/></svg>
        )
      case 'coach':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="3"/><path d="M5.5 22a6.5 6.5 0 0 1 13 0"/></svg>
        )
      case 'toolbox':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>
        )
      case 'check':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        )
      case 'database':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
        )
      case 'assessment':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h4"/><path d="M7 16h7"/></svg>
        )
      case 'target':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 2v4"/><path d="M12 18v4"/></svg>
        )
      default:
        return null
    }
  }

  function modalityIconName(name: string): 'blend' | 'online' | 'workshop' | 'coach' | 'toolbox' | 'modality' {
    const n = name.toLowerCase()
    if (n.includes('blend')) return 'blend'
    if (n.includes('e-') || n.includes('elearn') || n.includes('online')) return 'online'
    if (n.includes('workshop') || n.includes('live') || n.includes('classroom')) return 'workshop'
    if (n.includes('coach')) return 'coach'
    if (n.includes('tool')) return 'toolbox'
    return 'modality'
  }

  function extractReadiness(value: string | undefined): number | null {
    if (!value) return null
    const m1 = value.match(/(\d+)\s*\/\s*10/)
    if (m1) {
      const v = Math.max(0, Math.min(10, Number(m1[1])))
      return isNaN(v) ? null : v
    }
    const m2 = value.match(/(\d{1,2})/)
    if (m2) {
      const v = Math.max(0, Math.min(10, Number(m2[1])))
      return isNaN(v) ? null : v
    }
    return null
  }

  function StatsCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
    return (
      <div className="glass-card p-3 flex items-center gap-2">
        {icon}
        <div>
          <div className="text-[11px] text-white/60">{label}</div>
          <div className="text-sm font-semibold text-white/90">{value}</div>
        </div>
      </div>
    )
  }

  function computeTimelinePositions(items: Array<{ label: string; start: string; end: string }>) {
    const dates = items
      .map(i => ({ s: new Date(i.start), e: new Date(i.end) }))
      .filter(d => !isNaN(d.s.getTime()) && !isNaN(d.e.getTime()))
    if (dates.length !== items.length || dates.length === 0) return null
    const min = Math.min(...dates.map(d => d.s.getTime()))
    const max = Math.max(...dates.map(d => d.e.getTime()))
    const span = Math.max(1, max - min)
    const positions: Array<{ start: number; end: number }> = []
    for (let idx = 0; idx < items.length; idx++) {
      const d = dates[idx]
      const start = (d.s.getTime() - min) / span
      const end = (d.e.getTime() - min) / span
      positions.push({ start, end })
    }
    return positions
  }

  function parsePercentFromString(text: string): number | null {
    if (!text) return null
    const m = text.match(/(\d{1,3})\s*%/)
    if (m) {
      const v = Math.max(0, Math.min(100, Number(m[1])))
      return isNaN(v) ? null : v
    }
    const fraction = text.match(/(\d+)\s*\/\s*(\d+)/)
    if (fraction) {
      const a = Number(fraction[1]); const b = Number(fraction[2]) || 1
      const v = Math.round((a / b) * 100)
      return isNaN(v) ? null : Math.max(0, Math.min(100, v))
    }
    return null
  }

  function detectRiskSeverity(text: string): 'high' | 'medium' | 'low' {
    const t = text.toLowerCase()
    if (/(critical|severe|high|major)/.test(t)) return 'high'
    if (/(medium|moderate)/.test(t)) return 'medium'
    if (/(low|minor)/.test(t)) return 'low'
    return 'medium'
  }
  
  if (!report) {
    // Fallback to simple markdown display
    return (
      <div className={className}>
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: reportMarkdown
              .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h3>')
              .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
              .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
              .replace(/^\*\s+(.*)$/gim, '<ul class="list-disc list-inside text-white/80"><li>$1</li></ul>')
              .replace(/^\-\s+(.*)$/gim, '<ul class="list-disc list-inside text-white/80"><li>$1</li></ul>')
              .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-white/90">$1</strong>')
              .replace(/\*(.*?)\*/gim, '<em>$1</em>')
              .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-white/10 rounded text-primary-300">$1</code>')
              .replace(/\n/g, '<br />')
          }}
        />
      </div>
    )
  }
  
  // Render structured report like in Polaris page
  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main report */}
        <div className="lg:col-span-2">
          <article className="read-surface p-6" role="article" aria-labelledby="report-title">
            <div className="flex items-center gap-2 mb-4">
              {isEditingTitle ? (
                <>
                  <input
                    id="report-title"
                    className="input w-full md:w-96"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Name this report"
                    aria-label="Report name"
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn-primary"
                    aria-label={savingTitle ? 'Saving' : 'Save report name'}
                    title={savingTitle ? 'Saving' : 'Save report name'}
                    disabled={savingTitle || !titleInput.trim()}
                    onClick={async () => {
                      if (!titleInput.trim()) return
                      if (onSaveTitle) await onSaveTitle(titleInput.trim())
                      setIsEditingTitle(false)
                    }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Cancel"
                    title="Cancel"
                    onClick={() => { setIsEditingTitle(false); setTitleInput(reportTitle || 'Needs Analysis Report') }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <h1 id="report-title" className="heading-accent text-2xl md:text-3xl font-bold text-white tracking-tight">{reportTitle || 'Needs Analysis Report'}</h1>
                  {editableTitle && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      aria-label="Rename report"
                      title="Rename report"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                  )}
                </>
              )}
            </div>
            
            {/* Stat tiles - Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatsCard icon={<Icon name="audience" className="w-5 h-5 text-primary-300" />} label="Target Audiences" value={report.solution.scope?.audiences?.length || 0} />
              <StatsCard icon={<Icon name="modality" className="w-5 h-5 text-primary-300" />} label="Modalities" value={report.solution.modalities.length} />
              <StatsCard icon={<Icon name="metrics" className="w-5 h-5 text-primary-300" />} label="Success Metrics" value={report.measurement.success_metrics.length} />
              <StatsCard icon={<Icon name="steps" className="w-5 h-5 text-primary-300" />} label="Phases" value={report.delivery_plan.phases.length} />
            </div>

            {/* Stat tiles - Row 2 (spaced for aesthetics) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatsCard icon={<Icon name="assessment" className="w-5 h-5 text-primary-300" />} label="Assessment Items" value={report.measurement.assessment_strategy?.length || 0} />
              <StatsCard icon={<Icon name="database" className="w-5 h-5 text-primary-300" />} label="Data Sources" value={report.measurement.data_sources?.length || 0} />
              <StatsCard icon={<Icon name="risks" className="w-5 h-5 text-amber-300" />} label="Risks" value={report.risks?.length || 0} />
              <StatsCard icon={<Icon name="target" className="w-5 h-5 text-primary-300" />} label="Objectives" value={report.summary.objectives?.length || 0} />
            </div>

            {/* Learner tech readiness gauge (if detectable) */}
            {(() => {
              const readiness = extractReadiness(report.learner_analysis?.profile?.tech_readiness)
              if (readiness === null) return null
              const pct = Math.round((readiness / 10) * 100)
              return (
                <div className="glass-card p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="tech" className="w-5 h-5 accent-icon" />
                      <div className="text-sm font-semibold text-white/90 accent-text-soft">Learner Technology Readiness</div>
                    </div>
                    <div className="text-sm text-white/70">{pct}%</div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden bar-shimmer">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 bar-smooth" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}

            {/* Timeline visualization */}
            {report.delivery_plan.timeline.length > 0 && (() => {
              const positions = computeTimelinePositions(report.delivery_plan.timeline)
              if (!positions) return null
              return (
                <div className="glass-card p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="timeline" className="w-5 h-5 accent-icon" />
                    <div className="text-sm font-semibold text-white/90 accent-text-soft">Timeline Overview</div>
                  </div>
                  <div className="relative h-14">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10" />
                    {report.delivery_plan.timeline.map((t, i) => (
                      <div key={i} className="absolute" style={{ left: `${positions[i].start * 100}%`, width: `${Math.max(2, (positions[i].end - positions[i].start) * 100)}%` }}>
                        <div className="h-2 rounded-full bg-primary-400/70" />
                        <div className="mt-1 text-[11px] text-white/70 truncate">
                          <span className="text-white/85 font-medium">{t.label}</span>
                          <span className="ml-1">{t.start}–{t.end}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div className="space-y-8">
              {/* Executive Summary */}
              <section>
                <h2 id="executive-summary" className="heading-accent text-xl font-semibold text-white mb-3 scroll-mt-20">Executive Summary</h2>
                {report.summary.problem_statement && (
                  <p className="text-[15px] leading-7 text-white/80 mb-4">
                    <strong className="font-semibold text-white/90">Problem Statement:</strong> {report.summary.problem_statement}
                  </p>
                )}
                
                {report.summary.current_state.length > 0 && (
                  <div className="mb-3">
                    <strong className="font-semibold text-white/90">Current State:</strong>
                    <ul className="list-disc pl-5 marker:text-primary-300 text-white/80 leading-6 mt-1 space-y-1">
                      {report.summary.current_state.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.summary.root_causes.length > 0 && (
                  <div className="mb-3">
                    <strong className="font-semibold text-white/90">Root Causes:</strong>
                    <ul className="list-disc pl-5 marker:text-primary-300 text-white/80 leading-6 mt-1 space-y-1">
                      {report.summary.root_causes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.summary.objectives.length > 0 && (
                  <div className="mb-3">
                    <strong className="font-semibold text-white/90">Objectives:</strong>
                    <ul className="list-disc pl-5 marker:text-primary-300 text-white/80 leading-6 mt-1 space-y-1">
                      {report.summary.objectives.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              
              {/* Recommended Solution */}
              <section>
                <h2 id="recommended-solution" className="heading-accent text-xl font-semibold text-white mb-3 scroll-mt-20">Recommended Solution</h2>
                
                {report.solution.modalities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white/90 mb-2">Delivery Modalities</h3>
                    <div className="space-y-1">
                      {report.solution.modalities.map((m, i) => (
                        <div key={i} className="text-white/80 flex items-start gap-2">
                          <Icon name={modalityIconName(m.name)} className="w-4 h-4 text-primary-300 mt-0.5" />
                          <div>
                            <div className="font-semibold text-white/90">{m.name}</div>
                            <div className="text-[13px] text-white/70">{m.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {report.solution.scope && (
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 mb-2">Scope</h3>
                    
                    {report.solution.scope.audiences.length > 0 && (
                      <div className="mb-3">
                        <strong className="font-semibold text-white/90">Target Audiences:</strong>
                        <ul className="list-disc pl-5 marker:text-primary-300 text-white/80 leading-6 mt-1 space-y-1">
                          {report.solution.scope.audiences.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {report.solution.scope.competencies.length > 0 && (
                      <div className="mb-3">
                        <strong className="font-semibold text-white/90">Key Competencies:</strong>
                        <ul className="list-disc pl-5 marker:text-primary-300 text-white/80 leading-6 mt-1 space-y-1">
                          {report.solution.scope.competencies.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
              
              {/* Delivery Plan */}
              {report.delivery_plan.phases.length > 0 && (
                <section>
                  <h2 id="delivery-plan" className="heading-accent text-xl font-semibold text-white mb-3 scroll-mt-20">Delivery Plan</h2>
                  <div className="space-y-3">
                    {report.delivery_plan.phases.map((phase, i) => (
                      <div key={i}>
                        <h3 className="text-lg font-semibold text-white/90">
                          {phase.name} <span className="text-sm text-white/60">({phase.duration_weeks} weeks)</span>
                        </h3>
                        {phase.goals.length > 0 && (
                          <div className="mt-2">
                            <strong className="text-sm text-white/80">Goals:</strong>
                            <ul className="list-disc pl-5 marker:text-primary-300 text-sm text-white/70 mt-1 space-y-1 leading-6">
                              {phase.goals.map((g, j) => (
                                <li key={j}>{g}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </article>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-4 sticky-col">
          {/* TOC */}
          <nav className="glass-card p-4 md:p-5" aria-label="Table of contents">
            <h4 className="text-sm font-semibold mb-2 text-white/90">On this page</h4>
            <ul className="text-sm text-white/80 space-y-1">
              <li><a className="hover:text-primary-300" href="#executive-summary">Executive Summary</a></li>
              <li><a className="hover:text-primary-300" href="#recommended-solution">Recommended Solution</a></li>
              {report.delivery_plan.phases.length > 0 && (
                <li><a className="hover:text-primary-300" href="#delivery-plan">Delivery Plan</a></li>
              )}
            </ul>
          </nav>
          
          {/* Recommended Modalities */}
          {report.solution.modalities.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="solution" className="w-4 h-4 accent-icon" />
                <h4 className="text-sm font-semibold text-white/90 accent-text-soft">Recommended Modalities</h4>
              </div>
              <div className="space-y-2">
                {report.solution.modalities.map((m, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <Icon name={modalityIconName(m.name)} className="w-4 h-4 text-primary-300 mt-0.5" />
                    <div>
                      <span className="font-medium text-primary-300">{m.name}</span>
                      <p className="text-xs text-white/60 mt-0.5">{m.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Success Metrics */}
          {report.measurement.success_metrics.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="metrics" className="w-4 h-4 accent-icon" />
                <h4 className="text-sm font-semibold text-white/90 accent-text-soft">Success Metrics</h4>
              </div>
              <div className="space-y-2">
                {report.measurement.success_metrics.slice(0, 5).map((m, i) => {
                  const pct = parsePercentFromString(m)
                  return (
                    <div key={i}>
                      <div className="text-xs text-white/75 mb-1 flex items-center gap-1">
                        <Icon name="check" className="w-3.5 h-3.5 text-primary-300" />
                        <span>{m}</span>
                      </div>
                      {pct !== null && (
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden bar-shimmer">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-500 bar-smooth" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Timeline */}
          {report.delivery_plan.timeline.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="timeline" className="w-4 h-4 accent-icon" />
                <h4 className="text-sm font-semibold text-white/90 accent-text-soft">Timeline</h4>
              </div>
              <div className="space-y-2">
                {report.delivery_plan.timeline.map((t, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-white/80">{t.label}</span>
                    <p className="text-xs text-white/60">{t.start} to {t.end}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Immediate Next Steps */}
          {report.next_steps.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <h4 className="text-sm font-semibold mb-2 text-white/90 accent-text-soft">Immediate Next Steps</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-white/80 leading-6">
                {report.next_steps.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          
          {/* Risks */}
          {report.risks.length > 0 && (
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="risks" className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-white/90 accent-text-soft">Key Risks</h4>
              </div>
              <div className="space-y-2">
                {report.risks.slice(0, 3).map((r, i) => {
                  const sev = detectRiskSeverity(r.risk)
                  const color = sev === 'high' ? 'bg-red-500/30 text-red-200 border-red-400/40' : sev === 'low' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                  return (
                    <div key={i} className="text-sm">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                        <span className="text-xs capitalize">{sev}</span>
                      </div>
                      <div className="mt-1 font-medium text-white/90">{r.risk}</div>
                      <p className="text-xs text-white/60 mt-0.5">{r.mitigation}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
