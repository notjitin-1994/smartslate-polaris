import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import type { ReactNode } from 'react'
// Removed old parsing dependencies for the legacy view
import { generateShareLink, copyToClipboard, shareLinkNative } from '@/utils/shareUtils'
import { getReportPublicStatus, toggleReportPublicStatus } from '@/services/polarisSummaryService'
import { getStarmapPublicStatus, toggleStarmapPublicStatus } from '@/services/starmapJobsService'
import { IconButton } from '@/components'
import { extractInThisReportInfo, parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'


// Utilities
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

type TocItem = { id: string; text: string; level: number }

function buildTocFromMarkdown(md: string): TocItem[] {
  const lines = (md || '').split('\n')
  const out: TocItem[] = []
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/)
    if (m) {
      const level = Math.min(6, Math.max(1, m[1].length))
      const text = m[2].trim()
      const id = slugify(text)
      out.push({ id, text, level })
    }
  }
  return out
}

// Markdown → HTML renderer (tables, code, lists, headings, blockquotes)
function markdownToEnhancedHtml(md: string): string {
  try {
    const esc = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const applyInline = (s: string) => {
      return s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<u>$1</u>')
        .replace(/(^|\s)`([^`]+?)`(?=\s|$)/g, '$1<code class="px-1 rounded bg-white/10">$2</code>')
        .replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>')
        .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>')
    }

    const getCells = (line: string): string[] => {
      const parts = line.split('|').map(s => s.trim())
      while (parts.length && parts[0] === '') parts.shift()
      while (parts.length && parts[parts.length - 1] === '') parts.pop()
      return parts
    }

    const lines = (md || '').split('\n')
    const out: string[] = []
    let i = 0
    let inList = false
    let inBlockquote = false

    const closeList = () => { if (inList) { out.push('</ul>'); inList = false } }
    const closeBlockquote = () => { if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false } }

    while (i < lines.length) {
      const line = lines[i]

      // Code block
      if (/^```/.test(line)) {
        const buf: string[] = []
        const info = line.replace(/^```\s*/, '').trim().toLowerCase()
        i++
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++ }
        if (i < lines.length && /^```/.test(lines[i])) i++
        closeList(); closeBlockquote()
        out.push(`<pre class="rte-pre"><code class="rte-code language-${esc(info)}">${esc(buf.join('\n'))}</code></pre>`) 
        continue
      }

      // Table
      if (line.includes('|')) {
        const header = line
        const divider = lines[i + 1]
        const isDivider = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider || '')
        if (isDivider) {
          const headers = getCells(header)
          i += 2
          const rows: string[][] = []
          while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
            rows.push(getCells(lines[i])); i++
          }
          closeList(); closeBlockquote()
          out.push('<div class="overflow-x-auto"><table class="rte-table"><thead><tr>')
          headers.forEach(h => out.push(`<th>${applyInline(esc(h))}</th>`))
          out.push('</tr></thead><tbody>')
          rows.forEach(r => {
            out.push('<tr>')
            const cells = r.length > headers.length ? r.slice(0, headers.length) : r
            cells.forEach(c => out.push(`<td>${applyInline(esc(c))}</td>`))
            out.push('</tr>')
          })
          out.push('</tbody></table></div>')
          continue
        }
      }

      // Blockquote
      if (/^>\s+/.test(line)) {
        const content = line.replace(/^>\s+/, '')
        if (!inBlockquote) { closeList(); out.push('<blockquote class="rte-quote">'); inBlockquote = true }
        out.push(`<p>${applyInline(esc(content))}</p>`) ; i++; continue
      } else if (inBlockquote && line.trim() === '') {
        out.push('<br/>'); i++; continue
      } else if (inBlockquote) {
        closeBlockquote()
      }

      // Headings
      const hm = line.match(/^(#{1,6})\s+(.*)$/)
      if (hm) {
        closeList(); closeBlockquote()
        const level = Math.min(6, Math.max(1, hm[1].length))
        const text = hm[2].trim()
        const id = slugify(text)
        const cls = level === 1
          ? 'rte-h1'
          : level === 2
            ? 'rte-h2'
            : level === 3
              ? 'rte-h3'
              : 'rte-h4'
        out.push(`<h${level} id="${id}" class="${cls}">${applyInline(esc(text))}</h${level}>`)
        i++
        continue
      }

      // List
      if (/^[-*+]\s+/.test(line)) {
        if (!inList) { closeBlockquote(); out.push('<ul class="rte-ul">'); inList = true }
        out.push(`<li>${applyInline(esc(line.replace(/^[-*+]\s+/, '')))}</li>`) ; i++
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          out.push(`<li>${applyInline(esc(lines[i].replace(/^[-*+]\s+/, '')))}</li>`) ; i++
        }
        continue
      }

      // Blank lines → paragraph break
      if (line.trim() === '') { closeList(); i++; continue }

      // Paragraphs
      const buf: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6})\s+/.test(lines[i]) && !/^[-*+]\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>\s+/.test(lines[i])) {
        buf.push(lines[i]); i++
      }
      closeList(); closeBlockquote()
      out.push(`<p>${applyInline(esc(buf.join(' ')))}</p>`) 
    }
    closeList(); closeBlockquote()
    return out.join('')
  } catch {
    return `<pre class="rte-pre">${(md || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`
  }
}

// Remove specified H2+ sections and their content (until next H2 or end)
function removeSectionsFromMarkdown(markdown: string, sectionTitles: string[]): string {
  try {
    const lines = (markdown || '').split('\n')
    const out: string[] = []
    let i = 0
    let skip = false
    while (i < lines.length) {
      const line = lines[i]
      const m = line.match(/^(#{2,})\s+(.*)$/)
      if (m) {
        const title = m[2].trim().toLowerCase()
        const shouldSkip = sectionTitles.some(t => title.startsWith(t.toLowerCase()))
        skip = shouldSkip
      }
      if (!skip) out.push(line)
      // Stop skipping when next H2+ occurs
      if (skip) {
        const next = lines[i + 1]
        if (next && /^(#{2,})\s+/.test(next)) skip = false
      }
      i++
    }
    return out.join('\n')
  } catch {
    return markdown
  }
}

function AnimatedNumber({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span>{display}</span>
}

function parsePercent(value: string | null): number | null {
  if (!value) return null
  const m = String(value).match(/([\d.]+)\s*%?/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!isFinite(n)) return null
  return Math.max(0, Math.min(100, n > 1 && !String(value).includes('%') ? n : n))
}

function computeRiskDistribution(report: any): { low: number; medium: number; high: number } {
  const dist = { low: 0, medium: 0, high: 0 }
  if (!report?.risks?.length) return dist
  for (const r of report.risks) {
    const sev = (r.severity || 'medium').toLowerCase()
    if (sev === 'low') dist.low++
    else if (sev === 'high') dist.high++
    else dist.medium++
  }
  return dist
}


interface EnhancedReportDisplayProps {
  reportMarkdown: string
  reportTitle?: string
  editableTitle?: boolean
  onSaveTitle?: (newTitle: string) => void | Promise<void>
  className?: string
  // legacy props removed
  summaryId?: string
  starmapJobId?: string
  showGeneratedDate?: boolean
  headerActions?: ReactNode
}


// Main enhanced report display component
const EnhancedReportDisplay = memo(({ 
  reportMarkdown, 
  reportTitle = 'Needs Analysis Report',
  editableTitle = false,
  onSaveTitle,
  className = '',
  summaryId,
  starmapJobId,
  showGeneratedDate = true,
  headerActions
}: EnhancedReportDisplayProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(reportTitle)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [html, setHtml] = useState('')
  const [md, setMd] = useState('')

  const ensurePublic = useCallback(async () => {
    if (summaryId) {
      const { isPublic } = await getReportPublicStatus(summaryId)
      if (!isPublic) {
        await toggleReportPublicStatus(summaryId)
      }
    } else if (starmapJobId) {
      const { isPublic } = await getStarmapPublicStatus(starmapJobId)
      if (!isPublic) {
        await toggleStarmapPublicStatus(starmapJobId)
      }
    }
  }, [summaryId, starmapJobId])

  const handleShare = useCallback(async () => {
    if (!summaryId && !starmapJobId) return
    await ensurePublic()
    const link = summaryId
      ? generateShareLink(summaryId, { kind: 'summary' })
      : generateShareLink(starmapJobId!, { kind: 'starmap' })
    const outcome = await shareLinkNative({ url: link, title: titleInput })
    if (outcome === 'copied') {
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 2000)
    } else if (outcome === 'failed') {
      const copied = await copyToClipboard(link)
      if (copied) {
        setShowCopySuccess(true)
        setTimeout(() => setShowCopySuccess(false), 2000)
      }
    }
  }, [summaryId, starmapJobId, ensurePublic, titleInput])

  // Prepare markdown and HTML (convert JSON→Markdown if needed)
  useEffect(() => {
    const asMd = convertNaJsonStringToMarkdown(reportMarkdown) || reportMarkdown
    setMd(asMd)
    // Strip sections we replace with visual cards to avoid duplication
    const filtered = removeSectionsFromMarkdown(asMd, [
      'executive summary',
      'measurement framework',
      'risks & change readiness',
      'organization & audience',
    ])
    setHtml(markdownToEnhancedHtml(filtered))
  }, [reportMarkdown])

  // Build but do not render ToC (reserved for future quick-jump)
  useMemo(() => buildTocFromMarkdown(md), [md])
  const info = useMemo(() => extractInThisReportInfo(md), [md])
  const report = useMemo(() => parseMarkdownToReport(md || ''), [md])

  if (!reportTitle) {
    return (
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        <div className="text-center text-white/60">
          <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">No report data available</p>
        </div>
      </div>
    )
  }

  const counts = info?.counts || { modalities: 0, objectives: 0, phases: 0, metrics: 0, risks: 0 }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {showCopySuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-xl border border-white/15 bg-white/10 backdrop-blur-md shadow-2xl text-white/90 pointer-events-none"
        >
          Share link copied to clipboard!
        </div>
      )}

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="glass-card p-5 md:p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 relative overflow-hidden z-30">
          <div className="flex items-start justify-between mb-4">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => {
                  onSaveTitle?.(titleInput)
                  setIsEditingTitle(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveTitle?.(titleInput)
                    setIsEditingTitle(false)
                  } else if (e.key === 'Escape') {
                    setTitleInput(reportTitle)
                    setIsEditingTitle(false)
                  }
                }}
                className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-white/30 focus:border-primary-400 outline-none text-white w-full"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between gap-4 w-full">
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  {titleInput}
                  {editableTitle && (
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </h1>
                <div className="flex items-center gap-1.5 md:gap-2">
                  {headerActions && (
                    <div className="flex-shrink-0">{headerActions}</div>
                  )}
                  {(summaryId || starmapJobId) && (
                    <div className="relative">
                      <IconButton
                        ariaLabel="Copy share link"
                        title="Copy link"
                        variant="plain"
                        className="text-primary-300 hover:text-primary-200"
                        onClick={handleShare}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="18" cy="6" r="2.5" fill="currentColor" />
                          <circle cx="18" cy="18" r="2.5" fill="currentColor" />
                          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
                          <path d="M8.5 12L15.5 7.5M8.5 12L15.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </IconButton>
                    </div>
                  )}
                  {showGeneratedDate && (
                    <div className="text-xs md:text-sm text-white/60">
                      Generated {new Date().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Animated stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 text-white/90">
            <div className="stat-card"><div className="stat-label">Modalities</div><div className="stat-value"><AnimatedNumber value={counts.modalities} /></div></div>
            <div className="stat-card"><div className="stat-label">Objectives</div><div className="stat-value"><AnimatedNumber value={counts.objectives} /></div></div>
            <div className="stat-card hidden lg:block"><div className="stat-label">Phases</div><div className="stat-value"><AnimatedNumber value={counts.phases} /></div></div>
            <div className="stat-card"><div className="stat-label">Metrics</div><div className="stat-value"><AnimatedNumber value={counts.metrics} /></div></div>
            <div className="stat-card"><div className="stat-label">Risks</div><div className="stat-value"><AnimatedNumber value={counts.risks} /></div></div>
          </div>
        </div>
      </div>

      {/* Visual Highlights */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Executive Summary */}
          <section>
            <div className="glass-card p-5 overflow-hidden relative">
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(138,182,255,0.35), transparent 60%)' }} />
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l7-7 4 4L21 2"/><path d="M3 22h18"/></svg>
                  Executive Summary
                </div>
                {typeof report.summary.confidence === 'number' && (
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#7bd88f ${Math.round(report.summary.confidence * 100)}%, rgba(255,255,255,0.12) 0)` }} />
                    <div className="absolute inset-1 rounded-full bg-[rgba(0,0,0,0.35)] border border-white/10 flex items-center justify-center">
                      <div className="text-white text-xs font-semibold">{Math.round(report.summary.confidence * 100)}%</div>
                    </div>
                  </div>
                )}
              </div>
              {report.summary.problem_statement && (
                <p className="text-white/85 text-[0.95rem] leading-relaxed mb-4">{report.summary.problem_statement}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 mb-1">Current State</div>
                  <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                    {report.summary.current_state.slice(0,4).map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] text-white/60 mb-1">Objectives</div>
                  <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                    {report.summary.objectives.slice(0,4).map((s, i) => (<li key={i}>{s}</li>))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Measurement Framework */}
          <section>
            <div className="glass-card p-5">
              <div className="text-white font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/></svg>
                Measurement Framework
              </div>
              {report.measurement.success_metrics.length ? (
                <div className="space-y-3">
                  {report.measurement.success_metrics.slice(0,4).map((m, i) => {
                    const baselinePct = parsePercent(m.baseline || '')
                    const targetPct = parsePercent(m.target || '')
                    return (
                      <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white/90 text-sm font-medium">{m.metric}</div>
                          {m.timeframe && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">{m.timeframe}</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-white/60"><span>Baseline</span>{baselinePct !== null && <span>{baselinePct}%</span>}</div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white/30" style={{ width: `${Math.max(0, Math.min(100, baselinePct ?? 0))}%` }} /></div>
                          <div className="flex items-center justify-between text-[11px] text-white/60 mt-1"><span>Target</span>{targetPct !== null && <span>{targetPct}%</span>}</div>
                          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#8AB6FF]" style={{ width: `${Math.max(0, Math.min(100, targetPct ?? 0))}%` }} /></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-white/60 text-sm">No success metrics found.</div>
              )}
            </div>
          </section>

          {/* Risks & Change Readiness */}
          <section>
            <div className="glass-card p-5">
              <div className="text-white font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z"/></svg>
                Risks & Change Readiness
              </div>
              {report.risks.length ? (
                <div>
                  <div className="mb-3">
                    {(() => {
                      const dist = computeRiskDistribution(report)
                      const total = dist.low + dist.medium + dist.high || 1
                      const lowW = (dist.low/total)*100
                      const medW = (dist.medium/total)*100
                      const highW = (dist.high/total)*100
                      return (
                        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
                          <div style={{ width: `${lowW}%`, background: '#7bd88f' }} />
                          <div style={{ width: `${medW}%`, background: '#ffcc66' }} />
                          <div style={{ width: `${highW}%`, background: '#ff6b6b' }} />
                        </div>
                      )
                    })()}
                    <div className="flex gap-3 mt-2 text-[11px] text-white/70">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#7bd88f' }} />Low</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ffcc66' }} />Medium</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ff6b6b' }} />High</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {report.risks.slice(0,5).map((r, i) => (
                      <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="text-white/90 text-sm font-medium mb-1">{r.risk}</div>
                        <div className="text-white/65 text-xs">Mitigation: {r.mitigation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-white/60 text-sm">No risks captured.</div>
              )}
            </div>
          </section>

          {/* Organization & Audience */}
          <section>
            <div className="glass-card p-5">
              <div className="text-white font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 4 4 4z"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>
                Organization & Audience
              </div>
              {report.learner_analysis.profiles.length ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <div className="text-xs text-white/60 mb-1">Primary Profile</div>
                    <div className="text-white/85 text-sm">{report.learner_analysis.profiles[0].segment}</div>
                    {report.learner_analysis.profiles[0].roles?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {report.learner_analysis.profiles[0].roles.map((r, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">{r}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {report.learner_analysis.readiness_risks.length ? (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/60 mb-1">Readiness Risks</div>
                      <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                        {report.learner_analysis.readiness_risks.slice(0,5).map((r, i) => (<li key={i}>{r}</li>))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-white/60 text-sm">No learner profiles available.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 gap-6">
        <section>
          <div className="glass-card p-4 md:p-6 overflow-hidden">
            {html ? (
              <div
                className="prose-invert max-w-none rte prose-headings:scroll-mt-24"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="text-white/70">No content available.</div>
            )}
          </div>
        </section>
      </div>

      {/* Inline styles for RTE visuals */}
      <style>{`
        .glass-card { border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); border-radius: 1rem; backdrop-filter: blur(10px); }
        .stat-card { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.8rem; border:1px solid rgba(255,255,255,0.08); border-radius:0.75rem; background: rgba(255,255,255,0.04); }
        .stat-label { font-size: 0.72rem; opacity: 0.7; }
        .stat-value { font-size: 1.15rem; font-weight: 700; }
        .rte-h1 { font-size: 1.75rem; font-weight: 800; margin: 0.2rem 0 1rem; }
        .rte-h2 { font-size: 1.35rem; font-weight: 700; margin: 1.2rem 0 0.6rem; }
        .rte-h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.4rem; opacity: 0.95; }
        .rte-h4 { font-size: 1rem; font-weight: 600; margin: 0.8rem 0 0.3rem; opacity: 0.9; }
        .rte-ul { margin-left: 1.25rem; list-style: disc; }
        .rte-pre { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 0.75rem; overflow-x:auto; color: rgba(255,255,255,0.9); }
        .rte-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .rte-table { width: 100%; border-collapse: collapse; }
        .rte-table th, .rte-table td { border: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 0.6rem; }
        .rte-table th { background: rgba(255,255,255,0.06); text-align: left; font-weight: 600; }
        .rte-quote { border-left: 4px solid rgba(255,255,255,0.25); padding: 0.25rem 0 0.25rem 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.04); border-radius: 0.5rem; }
      `}</style>
    </div>
  )
})

EnhancedReportDisplay.displayName = 'EnhancedReportDisplay'

export default EnhancedReportDisplay
