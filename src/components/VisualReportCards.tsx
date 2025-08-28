import { useMemo } from 'react'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { markdownToHtml } from '@/lib/textUtils'

type VisualReportCardsProps = {
  reportMarkdown: string
  reportTitle?: string
  className?: string
}

type Section = { title: string; content: string }

function splitMarkdownByH2Sections(markdown: string): Section[] {
  const lines = (markdown || '').split('\n')
  const sections: Section[] = []
  let current: Section | null = null
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')
    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      if (current) sections.push(current)
      current = { title: h2[1].trim(), content: '' }
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line
    }
  }
  if (current) sections.push(current)
  return sections
}

export default function VisualReportCards({ reportMarkdown, reportTitle = 'Report', className = '' }: VisualReportCardsProps) {
  const md = useMemo(() => convertNaJsonStringToMarkdown(reportMarkdown) || reportMarkdown, [reportMarkdown])
  const parsed = useMemo(() => parseMarkdownToReport(md || ''), [md])
  const sections = useMemo(() => splitMarkdownByH2Sections(md || ''), [md])

  const renderGeneric = (content: string) => {
    const html = markdownToHtml(content || '')
    return (
      <div className="prose-invert max-w-none text-white/85" dangerouslySetInnerHTML={{ __html: html }} />
    )
  }

  const renderSection = (title: string, content: string, index: number) => {
    const t = title.toLowerCase()
    // Known dynamic sections first
    if (parsed) {
      if (/executive\s+summary/.test(t) && parsed.summary) {
        return (
          <div className="glass-card p-5" key={`sec-${index}`}>
            <div className="text-white font-semibold mb-3">Executive Summary</div>
            {parsed.summary.problem_statement && (
              <p className="text-white/85 text-sm mb-3">{parsed.summary.problem_statement}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsed.summary.current_state?.length ? (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 mb-1">Current State</div>
                  <ul className="list-disc pl-4 text-sm text-white/85 space-y-1">
                    {parsed.summary.current_state.slice(0,6).map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              ) : null}
              {parsed.summary.objectives?.length ? (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 mb-1">Objectives</div>
                  <ul className="list-disc pl-4 text-sm text-white/85 space-y-1">
                    {parsed.summary.objectives.slice(0,6).map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )
      }
      if (/measurement|metrics|evaluation/.test(t) && parsed.measurement) {
        return (
          <div className="glass-card p-5" key={`sec-${index}`}>
            <div className="text-white font-semibold mb-3">Measurement</div>
            {parsed.measurement.success_metrics?.length ? (
              <div className="space-y-3">
                {parsed.measurement.success_metrics.slice(0,6).map((m, i) => {
                  const baselineMatch = typeof m !== 'string' ? (m.baseline || '').match(/([\d.]+)%?/) : null
                  const targetMatch = typeof m !== 'string' ? (m.target || '').match(/([\d.]+)%?/) : null
                  const baseline = baselineMatch ? Math.min(100, Math.max(0, parseFloat(baselineMatch[1]))) : null
                  const target = targetMatch ? Math.min(100, Math.max(0, parseFloat(targetMatch[1]))) : null
                  const label = typeof m === 'string' ? m : (m.metric || `Metric ${i+1}`)
                  return (
                    <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white/90 text-sm font-medium">{label}</div>
                        {typeof m !== 'string' && m.timeframe && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">{m.timeframe}</span>
                        )}
                      </div>
                      {baseline !== null && (
                        <div className="mb-1">
                          <div className="flex items-center justify-between text-[11px] text-white/60"><span>Baseline</span><span>{baseline}%</span></div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white/30 bar-smooth" style={{ width: `${baseline}%` }} /></div>
                        </div>
                      )}
                      {target !== null && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-white/60"><span>Target</span><span>{target}%</span></div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#8AB6FF] bar-smooth-slow" style={{ width: `${target}%` }} /></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              renderGeneric(content)
            )}
          </div>
        )
      }
      if (/risk/.test(t) && parsed.risks) {
        const dist = parsed.risks.reduce((acc, r) => {
          const sev = (r.severity || 'medium').toLowerCase()
          if (sev === 'low') acc.low++
          else if (sev === 'high') acc.high++
          else acc.medium++
          return acc
        }, { low: 0, medium: 0, high: 0 })
        const total = Math.max(1, dist.low + dist.medium + dist.high)
        return (
          <div className="glass-card p-5" key={`sec-${index}`}>
            <div className="text-white font-semibold mb-3">Risks & Change Readiness</div>
            <div className="mb-3 w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
              <div style={{ width: `${(dist.low/total)*100}%`, background: '#7bd88f' }} />
              <div style={{ width: `${(dist.medium/total)*100}%`, background: '#ffcc66' }} />
              <div style={{ width: `${(dist.high/total)*100}%`, background: '#ff6b6b' }} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {parsed.risks.slice(0,6).map((r, i) => (
                <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-white/90 text-sm font-medium mb-1">{r.risk}</div>
                  <div className="text-white/65 text-xs">Mitigation: {r.mitigation}</div>
                </div>
              ))}
            </div>
          </div>
        )
      }
      if (/timeline|roadmap|schedule/.test(t) && parsed.delivery_plan?.timeline?.length) {
        return (
          <div className="glass-card p-5" key={`sec-${index}`}>
            <div className="text-white font-semibold mb-3">Project Timeline</div>
            <div className="space-y-3">
              {parsed.delivery_plan.timeline.map((t, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between text-sm text-white/85 mb-1">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-white/60">{t.start} → {t.end}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden bar-shimmer"><div className="h-full w-full bg-gradient-to-r from-primary-400 to-secondary-500" /></div>
                </div>
              ))}
            </div>
          </div>
        )
      }
    }
    // Fallback generic section renderer
    return (
      <div className="glass-card p-5" key={`sec-${index}`}>
        <div className="text-white font-semibold mb-3">{title || reportTitle}</div>
        {content && content.trim() ? (
          renderGeneric(content)
        ) : (
          <div className="text-white/60 text-sm">No content provided.</div>
        )}
      </div>
    )
  }

  if (!sections.length) {
    // No H2 sections — render entire markdown as one card
    return (
      <div className={`max-w-7xl mx-auto ${className}`}>
        <div className="glass-card p-5">
          <div className="text-white font-semibold mb-3">{reportTitle}</div>
          {renderGeneric(md)}
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      <div className="grid grid-cols-1 gap-6">
        {sections.map((s, i) => renderSection(s.title, s.content, i))}
      </div>
    </div>
  )
}


