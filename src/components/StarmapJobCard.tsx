import { useMemo } from 'react'
import type { StarmapJob } from '@/services/starmapJobsService'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'

type StarmapJobCardProps = {
  job: StarmapJob
  onView?: (jobId: string) => void
  onResume?: (jobId: string) => void
  onDelete?: (jobId: string) => void
  deleting?: boolean
}

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

function getStatusTone(status: StarmapJob['status'] | string): { text: string; classes: string } {
  switch (status) {
    case 'completed':
      return { text: 'Completed', classes: 'text-green-300 bg-green-400/15 border-green-400/30' }
    case 'processing':
    case 'queued':
      return { text: status === 'queued' ? 'Queued' : 'Processing', classes: 'text-amber-300 bg-amber-400/15 border-amber-400/30' }
    case 'failed':
      return { text: 'Failed', classes: 'text-red-300 bg-red-400/15 border-red-400/30' }
    case 'cancelled':
      return { text: 'Cancelled', classes: 'text-gray-300 bg-gray-400/15 border-gray-400/30' }
    default:
      return { text: 'In Progress', classes: 'text-blue-300 bg-blue-400/15 border-blue-400/30' }
  }
}

function useProgress(job: StarmapJob): number {
  // Prefer async progress when present; otherwise derive from stage completions
  if (typeof job.report_job_progress === 'number' && !Number.isNaN(job.report_job_progress)) {
    return Math.max(0, Math.min(100, job.report_job_progress))
  }
  const steps = [job.stage1_complete, job.stage2_complete, job.stage3_complete, job.dynamic_complete, Boolean(job.final_report)]
  const completed = steps.filter(Boolean).length
  return Math.round((completed / steps.length) * 100)
}

// (relative time helper removed; not used in the current card layout)

export function StarmapJobCard({ job, onView, onResume, onDelete, deleting }: StarmapJobCardProps) {
  const tone = getStatusTone(job.status)
  const created = useMemo(() => new Date(job.created_at).toLocaleDateString(), [job.created_at])
  const updated = useMemo(() => new Date(job.updated_at).toLocaleDateString(), [job.updated_at])
  const completed = job.completed_at ? new Date(job.completed_at).toLocaleDateString() : null
  const progressPct = useProgress(job)
  // Derived values used in summaries below (stages currently not displayed)

  // Pick a report source (final preferred, else preliminary)
  const reportSource = job.final_report || job.preliminary_report || ''
  // Parse report for structured summaries when available
  const parsed = useMemo(() => (reportSource ? parseMarkdownToReport(reportSource) : null), [reportSource])
  const timelineWeeks = useMemo(() => {
    const phases = parsed?.delivery_plan?.phases || []
    const timeline = parsed?.delivery_plan?.timeline || []
    const sumWeeks = phases.reduce((sum, p: any) => sum + (Number(p.duration_weeks) || 0), 0)
    if (sumWeeks > 0) return sumWeeks
    if (timeline.length > 0) {
      let minStart: number | null = null
      let maxEnd: number | null = null
      for (const t of timeline as any[]) {
        const s = Date.parse(t.start || '')
        const e = Date.parse(t.end || '')
        if (!Number.isNaN(s)) minStart = minStart === null ? s : Math.min(minStart, s)
        if (!Number.isNaN(e)) maxEnd = maxEnd === null ? e : Math.max(maxEnd, e)
      }
      if (minStart !== null && maxEnd !== null && maxEnd > minStart) {
        const days = Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24))
        return Math.max(1, Math.ceil(days / 7))
      }
    }
    return 0
  }, [parsed])
  const phaseCount = parsed?.delivery_plan?.phases?.length || 0
  // Metrics and risks are rendered from lists; counts aren't needed directly
  // Risk counts rendered via risksListFinal length; explicit counts not needed here

  // Heuristic fallbacks when parser yields little (works for most prose-style reports)
  const quickGuess = useMemo(() => {
    const text = reportSource || ''
    if (!text) return { weeks: 0, phases: 0, metrics: 0, risks: 0 }
    // sum all week counts mentioned
    const weekMatches = Array.from(text.matchAll(/(\d+)\s*(?:weeks?|w)\b/gi))
    const weeks = weekMatches.reduce((sum, m) => sum + (parseInt(m[1]) || 0), 0)
    // count mentions of phases
    const phases = (text.match(/\bphase\s*\d+|\bphases?\b/gi) || []).length
    // metrics: look for Target:, %, or increase/decrease verbs
    const metrics = (text.match(/\btarget:|\bbaseline:|\d+%|increase|decrease/gi) || []).length
    // risks: Risk: bullets or readiness risk mentions
    const risks = (text.match(/\brisk[:\-]|readiness\s+risk/gi) || []).length
    return { weeks, phases, metrics, risks }
  }, [reportSource])

  const timelineWeeksDisplay = timelineWeeks || quickGuess.weeks
  const phaseCountDisplay = phaseCount || quickGuess.phases
  // counts not used in list UIs, retained for potential future badges

  // Build actual item lists to render (top 3 with overflow count)
  const timelineList = useMemo(() => {
    const items: Array<{ label: string; detail?: string }> = []
    const tl = parsed?.delivery_plan?.timeline || []
    if (tl.length > 0) {
      for (const t of tl) {
        const label = (t as any)?.label || 'Milestone'
        const start = (t as any)?.start || ''
        const end = (t as any)?.end || ''
        items.push({ label, detail: [start, end].filter(Boolean).join(' → ') })
      }
      return items
    }
    const phases = parsed?.delivery_plan?.phases || []
    if (phases.length > 0) {
      for (const p of phases as any[]) {
        const name = p?.name || 'Phase'
        const weeks = p?.duration_weeks ? `${p.duration_weeks}w` : undefined
        items.push({ label: name, detail: weeks })
      }
    }
    return items
  }, [parsed])

  const metricsList = useMemo(() => {
    const list = (parsed?.measurement?.success_metrics || []).map((m: any) => {
      const title = m?.metric || 'Metric'
      const parts: string[] = []
      if (m?.baseline) parts.push(`Baseline: ${m.baseline}`)
      if (m?.target) parts.push(`Target: ${m.target}`)
      if (m?.timeframe) parts.push(`by ${m.timeframe}`)
      return { label: title, detail: parts.join(' · ') || undefined }
    })
    return list
  }, [parsed])

  const risksList = useMemo(() => {
    const list: Array<{ label: string; detail?: string }> = []
    for (const r of (parsed?.risks || []) as any[]) {
      if (!r) continue
      list.push({ label: r.risk || String(r), detail: r.mitigation ? `Mitigation: ${r.mitigation}` : undefined })
    }
    for (const rr of (parsed?.learner_analysis?.readiness_risks || []) as any[]) {
      if (!rr) continue
      list.push({ label: String(rr) })
    }
    return list
  }, [parsed])

  // Heuristic extraction as a robust fallback when structured parsing misses
  const { timelineItemsHeur, metricsItemsHeur, risksItemsHeur } = useMemo(() => {
    const items = { timelineItemsHeur: [] as Array<{ label: string; detail?: string }>, metricsItemsHeur: [] as Array<{ label: string; detail?: string }>, risksItemsHeur: [] as Array<{ label: string; detail?: string }> }
    if (!reportSource) return items
    const lines = reportSource.split('\n')
    let section: 'none' | 'timeline' | 'metrics' | 'risks' = 'none'

    // Timeline heuristics
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const line = raw.trim()
      const header = line.match(/^#{1,6}\s+(.+)/)
      if (header) {
        const h = header[1].toLowerCase()
        if (/timeline|implementation\s+roadmap|delivery\s+plan/.test(h)) section = 'timeline'
        else if (/success\s+metrics|measurement|kpis?/.test(h)) section = 'metrics'
        else if (/risk/.test(h)) section = 'risks'
        else section = 'none'
      }
      let m = line.match(/^(?:[-*]\s*)?(Phase\s*\d+[^:]*|Milestone[^:]*|(?:Week|Sprint)\s*\d+[^:]*)(?::\s*(.*))?$/i)
      if (m) {
        const label = (m[1] || '').trim()
        let detail = (m[2] || '').trim()
        if (!detail) {
          const wk = line.match(/(\d+)\s*(?:weeks?|w)\b/i)
          if (wk) detail = `${wk[1]}w`
        }
        if (label) items.timelineItemsHeur.push({ label, detail: detail || undefined })
        continue
      }
      m = line.match(/^(?:[-*]\s*)?(.+?):\s*(\d{4}-\d{2}-\d{2}).*?to.*?(\d{4}-\d{2}-\d{2})/i)
      if (m) {
        items.timelineItemsHeur.push({ label: m[1].trim(), detail: `${m[2]} → ${m[3]}` })
        continue
      }
      if (section === 'timeline') {
        const bullet = line.match(/^(?:[-*•]\s+)(.+)/)
        if (bullet) {
          const txt = bullet[1].trim()
          const wk = txt.match(/\((\d+)\s*w(?:eeks?)?\)|\b(\d+)\s*w(?:eeks?)?\b/i)
          const weeks = wk ? (wk[1] || wk[2]) : undefined
          items.timelineItemsHeur.push({ label: txt.replace(/\((?:\d+)\s*w.*?\)/i, '').trim(), detail: weeks ? `${weeks}w` : undefined })
          continue
        }
      }
      if (items.timelineItemsHeur.length >= 5) break
    }

    // Metrics heuristics
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const header = line.match(/^#{1,6}\s+(.+)/)
      if (header) {
        const h = header[1].toLowerCase()
        if (/success\s+metrics|measurement|kpis?/.test(h)) section = 'metrics'
        else if (/risk/.test(h)) section = 'risks'
        else if (/timeline|implementation\s+roadmap|delivery\s+plan/.test(h)) section = 'timeline'
        else section = 'none'
      }
      let m = line.match(/^(?:[-*]\s*)?(.+?)\s*(?:→|->)\s*(.+)$/)
      if (m) {
        const metric = m[1].trim()
        const target = m[2].trim()
        items.metricsItemsHeur.push({ label: metric, detail: target })
        continue
      }
      m = line.match(/^(?:[-*]\s*)?(.+?):\s*Target:\s*(.+)$/i)
      if (m) {
        items.metricsItemsHeur.push({ label: m[1].trim(), detail: `Target: ${m[2].trim()}` })
        continue
      }
      m = line.match(/^(?:[-*]\s*)?(.+?):\s*(\d+%)(?:\s+by\s+(.+))?$/i)
      if (m) {
        const detail = m[3] ? `${m[2]} by ${m[3]}` : m[2]
        items.metricsItemsHeur.push({ label: m[1].trim(), detail })
        continue
      }
      if (section === 'metrics') {
        const bullet = line.match(/^(?:[-*•]\s+)(.+)/)
        if (bullet) {
          const txt = bullet[1].trim()
          const split = txt.split(/\s[-–—:]\s/)
          if (split.length > 1) items.metricsItemsHeur.push({ label: split[0].trim(), detail: split.slice(1).join(' - ').trim() })
          else items.metricsItemsHeur.push({ label: txt })
          continue
        }
      }
      if (items.metricsItemsHeur.length >= 5) break
    }

    // Broad-spectrum metrics extraction if still empty: scan whole text for likely metric lines
    if (items.metricsItemsHeur.length === 0) {
      const metricLineRegex = /^(?:[-*•]\s*)?(.{4,}?(?:Target:|\d+%|increase|decrease).*)$/gim
      let m2: RegExpExecArray | null
      while ((m2 = metricLineRegex.exec(reportSource)) && items.metricsItemsHeur.length < 5) {
        const raw = m2[1].trim()
        const split = raw.split(/\s[-–—:]\s/)
        if (split.length > 1) items.metricsItemsHeur.push({ label: split[0].trim(), detail: split.slice(1).join(' - ').trim() })
        else items.metricsItemsHeur.push({ label: raw })
      }
    }

    // Risks heuristics
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const riskMatch = line.match(/\bRisk:\s*(.+)/i)
      if (riskMatch) {
        let detail: string | undefined
        const next = lines[i + 1]?.trim()
        const mit = next?.match(/\bMitigation:\s*(.+)/i)
        if (mit) detail = `Mitigation: ${mit[1]}`
        items.risksItemsHeur.push({ label: riskMatch[1], detail })
        continue
      }
      const header = line.match(/^#{1,6}\s+(.+)/)
      if (header) {
        const h = header[1].toLowerCase()
        if (/risk/.test(h)) section = 'risks'
        else if (/success\s+metrics|measurement/.test(h)) section = 'metrics'
        else section = 'none'
      }
      if (section === 'risks') {
        const bullet = line.match(/^(?:[-*•]\s+)(.+)/)
        if (bullet) {
          items.risksItemsHeur.push({ label: bullet[1].trim() })
          continue
        }
      }
      if (items.risksItemsHeur.length >= 5) break
    }

    // Broad-spectrum risk extraction if still empty: scan bullets near 'Risk' words
    if (items.risksItemsHeur.length === 0) {
      const riskBlockRegex = /(#+\s*Risk[^\n]*[\s\S]*?)(?=^#|\Z)/gim
      const bulletRegex = /^(?:[-*•]\s+)(.+)$/gim
      let block2: RegExpExecArray | null
      let had = false
      while ((block2 = riskBlockRegex.exec(reportSource)) && items.risksItemsHeur.length < 5) {
        let m3: RegExpExecArray | null
        const chunk = block2[1]
        while ((m3 = bulletRegex.exec(chunk)) && items.risksItemsHeur.length < 5) {
          items.risksItemsHeur.push({ label: m3[1].trim() })
          had = true
        }
      }
      if (!had) {
        // fallback to any line containing the word risk
        const anyRisk = /^(?:[-*•]\s*)?(.{4,}?risk.{2,})$/gim
        let r2: RegExpExecArray | null
        // eslint-disable-next-line no-cond-assign
        while ((r2 = anyRisk.exec(reportSource)) && items.risksItemsHeur.length < 5) {
          const txt = (r2 && r2[1] ? r2[1] : '').trim()
          if (txt) items.risksItemsHeur.push({ label: txt })
        }
      }
    }

    return items
  }, [reportSource])

  // Build final timeline items. If none parsed, synthesize items from counts to avoid empty UI.
  let timelineListFinal = timelineList.length > 0 ? timelineList : timelineItemsHeur
  if (timelineListFinal.length === 0 && (timelineWeeksDisplay > 0 || phaseCountDisplay > 0)) {
    const phases = Math.max(phaseCountDisplay || 0, 3)
    const weeksEach = timelineWeeksDisplay > 0 ? Math.max(1, Math.round(timelineWeeksDisplay / phases)) : undefined
    timelineListFinal = Array.from({ length: phases }).map((_, i) => ({
      label: `Phase ${i + 1}`,
      detail: weeksEach ? `${weeksEach}w` : undefined,
    }))
  }

  // Compute timeline widths based on parsed/synthesized weeks
  const timelineWidths = useMemo(() => {
    const weeks: number[] = timelineListFinal.slice(0, 3).map((it) => {
      const m = (it.detail || '').match(/(\d+)\s*w/i)
      return m ? parseInt(m[1]) : 1
    })
    const max = Math.max(...weeks, 1)
    return weeks.map((w) => Math.round((w / max) * 100))
  }, [timelineListFinal])
  const metricsListFinal = metricsList.length > 0 ? metricsList : metricsItemsHeur
  const risksListFinal = risksList.length > 0 ? risksList : risksItemsHeur

  // -------- Presentation helpers (format JSON-like text nicely) --------
  function normalizeMetric(item: { label: string; detail?: string }) {
    const combined = `${item.label} ${item.detail || ''}`
    // Try to parse JSON-like content
    const jsonLike = combined.match(/\{[^}]+\}/)
    if (jsonLike) {
      const txt = jsonLike[0]
      const pick = (key: string) => {
        // Matches: "metric": "..." or metric: ...
        const re = new RegExp(`(?:["']?${key}["']?)\\s*:\\s*["']?([^,'"}\\\]]+)`, 'i')
        const m = txt.match(re)
        return m ? m[1] : undefined
      }
      const metric = pick('metric') || item.label.replace(/^[\-\*•]\s*/, '').replace(/[{}\[\]"]/g, '')
      const baseline = pick('baseline')
      const target = pick('target')
      const timeframe = pick('timeframe')
      return { title: metric, baseline, target, timeframe }
    }
    // Non-JSON: try to split
    const m1 = combined.match(/^(.*?)\s*(?:—|-|:)?\s*(Target:[^|]+)?\s*(?:\|\s*)?(Baseline:[^|]+)?\s*(?:\|\s*)?(by\s+[^|]+)?/i)
    const title = (m1?.[1] || item.label).trim()
    const baseline = (m1?.[3] || '').replace(/Baseline:\s*/i, '').trim() || undefined
    const target = (m1?.[2] || item.detail || '').replace(/Target:\s*/i, '').trim() || undefined
    const timeframe = (m1?.[4] || item.detail || '').replace(/^by\s+/i, '').trim() || undefined
    return { title, baseline, target, timeframe }
  }

  function extractPercent(input?: string): number | null {
    if (!input) return null
    const m = input.match(/(\d{1,3})\s*%/)
    if (m) return Math.max(0, Math.min(100, parseInt(m[1])))
    return null
  }

  function parseIsoOrDateish(input?: string): number | null {
    if (!input) return null
    const ts = Date.parse(input)
    if (!Number.isNaN(ts)) return ts
    // Try yyyy-mm or mm/yyyy
    const m1 = input.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/)
    if (m1) {
      const y = parseInt(m1[1]); const mo = parseInt(m1[2]) - 1; const d = m1[3] ? parseInt(m1[3]) : 1
      return new Date(y, mo, d).getTime()
    }
    return null
  }

  function computeTimePct(createdAtIso: string, due?: string | null): number | null {
    const start = Date.parse(createdAtIso)
    const end = parseIsoOrDateish(due || undefined)
    if (Number.isNaN(start) || !end) return null
    const now = Date.now()
    const total = Math.max(1, end - start)
    const elapsed = Math.max(0, Math.min(total, now - start))
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  }

  function normalizeRisk(item: { label: string; detail?: string }) {
    const raw = `${item.label} ${item.detail || ''}`
    // Skip container lines like readiness_risks:
    if (/readiness\s*_?risks?:/i.test(raw)) return null
    const riskMatch = raw.match(/risk\s*:?\s*([^\"]+?)(?:mitigation|$)/i)
    const mitigationMatch = raw.match(/mitigation\s*:?\s*([^\"]+)/i)
    const risk = (riskMatch?.[1] || item.label).replace(/[{}\[\]"]/g, '').trim()
    const mitigation = (mitigationMatch?.[1] || item.detail || '').replace(/[{}\[\]"]/g, '').trim() || undefined
    return { risk, mitigation }
  }

  const displayMetrics = useMemo(() => metricsListFinal
    .map(normalizeMetric)
    .map(m => ({
      ...m,
      targetPct: extractPercent(m.target || m.timeframe || ''),
      timePct: computeTimePct(job.created_at, m.timeframe || null)
    }))
  , [metricsListFinal])

  // Risk severity heuristics for infographic
  function getRiskSeverity(text: string): 'high' | 'medium' | 'low' {
    const t = (text || '').toLowerCase()
    if (/(critical|no\s+internal|blocked|failure|severe|major)/.test(t)) return 'high'
    if (/(limitation|delay|limited|risk\b|concern|lack)/.test(t)) return 'medium'
    return 'low'
  }

  function severityBarWidth(level: 'high' | 'medium' | 'low'): number {
    return level === 'high' ? 100 : level === 'medium' ? 66 : 33
  }

  const displayRisks = useMemo(() => {
    const arr = risksListFinal.map(normalizeRisk).filter(Boolean) as Array<{ risk: string; mitigation?: string }>
    return arr
  }, [risksListFinal])

  const ring = useMemo(() => {
    const size = 52
    const stroke = 6
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const dash = (progressPct / 100) * c
    return { size, stroke, r, c, dash }
  }, [progressPct])

  // Fallback timeline estimate from dates if parsing yields nothing
  const fallbackWeeksFromDates = useMemo(() => {
    try {
      const start = Date.parse(job.created_at)
      const endCandidate = job.completed_at || job.updated_at
      const end = endCandidate ? Date.parse(endCandidate) : Date.now()
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      return Math.max(1, Math.ceil(days / 7))
    } catch {
      return 0
    }
  }, [job.created_at, job.updated_at, job.completed_at])

  return (
    <div className="glass-card rounded-xl p-4 md:p-5 border border-white/10 hover:border-primary-400/30 hover:bg-white/5 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Progress ring + status */}
        <div className="shrink-0 relative">
          <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`} className="block">
            <circle
              cx={ring.size / 2}
              cy={ring.size / 2}
              r={ring.r}
              stroke="currentColor"
              className="text-white/10"
              strokeWidth={ring.stroke}
              fill="none"
            />
            <circle
              cx={ring.size / 2}
              cy={ring.size / 2}
              r={ring.r}
              stroke="url(#grad)"
              strokeWidth={ring.stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${ring.dash} ${ring.c - ring.dash}`}
              transform={`rotate(-90 ${ring.size / 2} ${ring.size / 2})`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(var(--secondary-light))" />
                <stop offset="100%" stopColor="rgb(var(--secondary))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/80">
            {progressPct}%
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-white font-semibold text-base md:text-lg truncate">
              {job.title || 'Untitled Starmap'}
            </h3>
            <span className={classNames('ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors', tone.classes)}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {tone.text}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/60">
            <span>Created: {created}</span>
            <span>Updated: {updated}</span>
            {completed && <span>Completed: {completed}</span>}
          </div>

          {/* Stage indicators */}
          <div className="mt-3 flex items-center gap-2">
            {[
              { key: 'S1', v: job.stage1_complete },
              { key: 'S2', v: job.stage2_complete },
              { key: 'S3', v: job.stage3_complete },
              { key: 'Dyn', v: job.dynamic_complete },
              { key: 'Rep', v: Boolean(job.final_report) },
            ].map((s) => (
              <div key={s.key} className={classNames('px-2 py-1 rounded-md text-[10px] border transition-all', s.v ? 'bg-green-400/15 text-green-200 border-green-400/30' : 'bg-white/5 text-white/60 border-white/10')}>{s.key}</div>
            ))}
          </div>

          {/* Infographics row (timeline, metrics, risks) */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Timeline (actual items) */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-[10px] text-white/60 mb-1 flex items-center gap-2">
                <span>Timeline</span>
                {timelineWeeksDisplay > 0 && (
                  <span className="ml-auto text-[10px] text-white/50">Total: {timelineWeeksDisplay}w</span>
                )}
              </div>
              {timelineListFinal.length > 0 ? (
                <div className="space-y-2">
                  {timelineListFinal.slice(0, 3).map((it, i) => (
                    <div key={i} className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--secondary))]" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white/90 truncate" title={it.label}>{it.label}</div>
                          {it.detail && <div className="text-[10px] text-white/60">{it.detail}</div>}
                        </div>
                      </div>
                      {/* Weeks-relative bar */}
                      <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[rgb(var(--secondary-light))] to-[rgb(var(--secondary))] bar-smooth" style={{ width: `${timelineWidths[i]}%` }} />
                      </div>
                    </div>
                  ))}
                  {timelineListFinal.length > 3 && (
                    <div className="text-[10px] text-white/60">+{timelineListFinal.length - 3} more</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-white/60">
                  {timelineWeeksDisplay > 0 || phaseCountDisplay > 0 ? (
                    <span>{timelineWeeksDisplay > 0 ? `${timelineWeeksDisplay} weeks total` : `${phaseCountDisplay} phases`}</span>
                  ) : (
                    <span>{fallbackWeeksFromDates > 0 ? `${fallbackWeeksFromDates} weeks total` : 'Parsing…'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Success Metrics (actual list with infographic bars) */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-[10px] text-white/60 mb-1">Success Metrics</div>
              {displayMetrics.length > 0 ? (
                <ul className="space-y-2 text-xs text-white/85">
                  {displayMetrics.slice(0, 3).map((m, i) => (
                    <li key={i} className="min-w-0">
                      <div className="min-w-0">
                        <div className="font-medium text-white/90 truncate" title={m.title}>{m.title}</div>
                        <div className="text-white/60">
                          {m.baseline ? <span>Baseline: {m.baseline} · </span> : null}
                          {m.target ? <span>Target: {m.target}</span> : null}
                          {m.timeframe ? <span> · by {m.timeframe}</span> : null}
                        </div>
                      </div>
                      {/* Infographic: Target vs Time progress */}
                      <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
                        {m.timePct !== null && (
                          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-white/5 to-white/5" aria-hidden="true">
                            <div className="h-full bg-gradient-to-r from-indigo-400/30 to-indigo-500/30 bar-smooth" style={{ width: `${m.timePct}%` }} />
                          </div>
                        )}
                        {m.targetPct !== null && (
                          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 bar-smooth" style={{ width: `${m.targetPct}%` }} />
                        )}
                      </div>
                      <div className="mt-0.5 flex justify-between text-[10px] text-white/50">
                        <span>{m.targetPct !== null ? `${m.targetPct}% target` : 'Target n/a'}</span>
                        <span>{m.timePct !== null ? `${m.timePct}% time elapsed` : ''}</span>
                      </div>
                    </li>
                  ))}
                  {displayMetrics.length > 3 && (
                    <li className="text-white/60">+{displayMetrics.length - 3} more</li>
                  )}
                </ul>
              ) : (
                <div className="text-xs text-white/60">Parsing…</div>
              )}
            </div>

            {/* Risks (actual list) */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-2 hidden md:block">
              <div className="text-[10px] text-white/60 mb-1">Risks</div>
              {displayRisks.length > 0 ? (
                <ul className="space-y-2 text-xs text-white/85">
                  {displayRisks.slice(0, 3).map((r, i) => {
                    const sev = getRiskSeverity(r.risk)
                    const w = severityBarWidth(sev)
                    const color = sev === 'high' ? 'from-red-400 to-red-500' : sev === 'medium' ? 'from-amber-400 to-amber-500' : 'from-yellow-300 to-yellow-400'
                    return (
                      <li key={i} className="min-w-0">
                        <div className="min-w-0">
                          <div className="font-medium text-white/90 truncate" title={r.risk}>{r.risk}</div>
                          {r.mitigation ? (
                            <div className="text-white/60">Mitigation: {r.mitigation}</div>
                          ) : null}
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${color} bar-smooth`} style={{ width: `${w}%` }} />
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/50 capitalize">Severity: {sev}</div>
                      </li>
                    )
                  })}
                  {displayRisks.length > 3 && (
                    <li className="text-white/60">+{displayRisks.length - 3} more</li>
                  )}
                </ul>
              ) : (
                <div className="text-xs text-white/60">Parsing…</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {job.status === 'completed' && job.final_report ? (
              <button
                onClick={() => onView?.(job.id)}
                className="px-3 py-1.5 rounded-lg bg-secondary-500/20 text-secondary-300 hover:bg-secondary-500/30 transition-colors"
              >
                View Report
              </button>
            ) : job.status === 'draft' ? (
              <button
                onClick={() => onResume?.(job.id)}
                className="px-3 py-1.5 rounded-lg bg-secondary-500/20 text-secondary-300 hover:bg-secondary-500/30 transition-colors"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={() => onResume?.(job.id)}
                className="px-3 py-1.5 rounded-lg bg-secondary-500/20 text-secondary-300 hover:bg-secondary-500/30 transition-colors"
              >
                Check Status
              </button>
            )}

            <button
              onClick={() => onDelete?.(job.id)}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StarmapJobCard


