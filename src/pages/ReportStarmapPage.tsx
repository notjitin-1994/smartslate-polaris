import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Share2, CheckCircle2 } from 'lucide-react'
import { saveAs } from 'file-saver'
import EnhancedReportDisplay from '@/components/EnhancedReportDisplay'
import { getStarmapJob, type StarmapJob, getStarmapPublicStatus, toggleStarmapPublicStatus } from '@/services/starmapJobsService'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import { extractInThisReportInfo, parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { generateShareLink, shareLinkNative, copyToClipboard } from '@/utils/shareUtils'

/**
 * Polaris Starmap Report Viewer (Path B)
 * Route: /report/starmap/:id
 *
 * Fetches starmap job by id (Supabase) and renders the final report
 * using our existing EnhancedReportDisplay. Falls back to preliminary
 * report when final is unavailable. Includes graceful loading and error states.
 */
export default function ReportStarmapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<StarmapJob | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'full'>('full')
  const [filter, setFilter] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!id) {
        setError('Missing starmap id')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const { data, error } = await getStarmapJob(id)
        if (error) throw error
        if (mounted) setJob(data)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load starmap')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const markdown = useMemo(() => {
    if (!job) return ''
    const raw = job.final_report || job.preliminary_report || ''
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
    // If content already looks like JSON, pass-through; EnhancedReportDisplay handles conversion too,
    // but we need markdown here for parsing sections and KPIs.
    if (text.trim().startsWith('{')) return text
    return convertNaJsonStringToMarkdown(text) || text
  }, [job])

  const info = useMemo(() => extractInThisReportInfo(markdown), [markdown])

  // Section parsing retained for potential future quick-jump features
  useMemo(() => markdown, [markdown])

  useMemo(() => filter, [filter])

  const report = useMemo(() => parseMarkdownToReport(markdown), [markdown])

  const timelineData = useMemo(() => {
    if (!report) return { segments: [] as Array<{ label: string; left: number; width: number }>, durationLabel: null as string | null }
    const timeline = report.delivery_plan.timeline.filter(t => t.start && t.end)
    if (timeline.length > 0) {
      const dates = timeline.map(t => ({ s: new Date(String(t.start)), e: new Date(String(t.end)) }))
      const minStart = new Date(Math.min(...dates.map(d => d.s.getTime())))
      const maxEnd = new Date(Math.max(...dates.map(d => d.e.getTime())))
      const totalMs = Math.max(1, maxEnd.getTime() - minStart.getTime())
      const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24))
      const durationLabel = totalDays >= 14 ? `${Math.round(totalDays / 7)} weeks` : `${totalDays} days`
      const segments = timeline.map(t => {
        const s = new Date(String(t.start!)).getTime()
        const e = new Date(String(t.end!)).getTime()
        const left = ((s - minStart.getTime()) / totalMs) * 100
        const width = Math.max(1, ((e - s) / totalMs) * 100)
        return { label: t.label, left, width }
      })
      return { segments, durationLabel }
    }
    // Fallback: build from phases duration
    const phases = report.delivery_plan.phases.filter(p => (p.duration_weeks || 0) > 0)
    if (phases.length > 0) {
      const totalWeeks = phases.reduce((sum, p) => sum + (p.duration_weeks || 0), 0)
      const segments = [] as Array<{ label: string; left: number; width: number }>
      let acc = 0
      for (const p of phases) {
        const w = (p.duration_weeks / Math.max(1, totalWeeks)) * 100
        segments.push({ label: p.name, left: (acc / Math.max(1, totalWeeks)) * 100, width: Math.max(1, w) })
        acc += p.duration_weeks
      }
      const durationLabel = totalWeeks >= 2 ? `${totalWeeks} weeks` : `${totalWeeks * 7} days`
      return { segments, durationLabel }
    }
    return { segments: [], durationLabel: null as string | null }
  }, [report])

  const confidencePct = Math.round(((report?.summary.confidence ?? 0.5) * 100))
  const riskScore = useMemo(() => {
    if (!report) return 0
    const unknowns = report.summary.unknowns?.length || 0
    const risks = report.risks?.length || 0
    const denom = 10
    const score = Math.min(100, Math.round(((risks * 2 + unknowns) / denom) * 100))
    return score
  }, [report])

  function parsePercent(value: string | null): number | null {
    if (!value) return null
    const m = String(value).match(/([\d.]+)\s*%?/)
    if (!m) return null
    const n = parseFloat(m[1])
    if (!isFinite(n)) return null
    return Math.max(0, Math.min(100, n > 1 && !String(value).includes('%') ? n : n))
  }

  function computeRiskDistribution() {
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

  // Dynamic tips to increase confidence and reduce risk
  const { confidenceTips, riskTips } = useMemo(() => {
    const c: string[] = []
    const r: string[] = []
    const unknownsCount = report?.summary.unknowns?.length || 0
    const risksCount = report?.risks?.length || 0
    const objectivesCount = report?.summary.objectives?.length || 0
    const metrics = report?.measurement.success_metrics || []
    const metricsWithoutBaseline = metrics.filter(m => !m.baseline || (typeof m.baseline === 'string' && m.baseline.trim() === '')).length
    const hasTimeline = timelineData.segments.length > 0
    const hasReportingCadence = !!report?.measurement.learning_analytics.reporting_cadence

    if (unknownsCount > 0) {
      c.push('Close top unknowns via stakeholder interviews and doc review')
      r.push('Convert unknowns into tracked assumptions with owners')
    }

    if (objectivesCount < 3) c.push('Refine 3–5 measurable objectives aligned to business outcomes')

    if (metrics.length < 3) c.push('Add success metrics with clear targets and timeframes')
    if (metricsWithoutBaseline > 0) {
      c.push('Establish baselines for key metrics to show movement')
      r.push('Define baselines to reduce estimation variance')
    }

    if (!hasTimeline) {
      r.push('Add timeline or phase durations to reduce schedule risk')
      c.push('Publish a milestone plan with owners and dates')
    }

    if (!hasReportingCadence) c.push('Set a reporting cadence (weekly/biweekly) for progress')

    if ((report?.learner_analysis.readiness_risks?.length || 0) > 0) r.push('Design readiness interventions for learner constraints')
    if ((report?.technology_talent.technology.gaps?.length || 0) > 0) r.push('Run a quick integration feasibility spike for key tech gaps')
    if (risksCount > 0) r.push('Assign owners and mitigations for top 3 risks')

    if (c.length === 0) c.push('Clarify acceptance criteria and define measurable success metrics')
    if (r.length === 0) r.push('Identify and track top risks with mitigations and owners')

    return { confidenceTips: c, riskTips: r }
  }, [report, timelineData])

  const ensurePublicAndShare = useCallback(async () => {
    if (!job) return
    try {
      const { isPublic } = await getStarmapPublicStatus(job.id)
      if (!isPublic) {
        await toggleStarmapPublicStatus(job.id)
      }
      const link = generateShareLink(job.id, { kind: 'starmap' })
      const outcome = await shareLinkNative({ url: link, title: job.title || 'Polaris Starmap' })
      if (outcome === 'copied') {
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 1800)
      } else if (outcome === 'failed') {
        const copied = await copyToClipboard(link)
        if (copied) {
          setShowCopied(true)
          setTimeout(() => setShowCopied(false), 1800)
        }
      }
    } catch {}
  }, [job])

  const downloadMarkdown = useCallback(() => {
    if (!job) return
    const md = markdown || ''
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const filename = `${(job.title || 'starmap-report').replace(/\s+/g, '-').toLowerCase()}.md`
    saveAs(blob, filename)
  }, [job, markdown])

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading report…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 border border-red-500/30 rounded-lg text-red-100 bg-red-500/15">{error}</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg btn-ghost"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-white/60">Starmap not found.</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 md:mb-8">
        <div className="glass-card p-5 md:p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 relative overflow-hidden z-30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              {job.title || 'Needs Analysis Report'}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={downloadMarkdown} className="icon-btn" title="Download Markdown" aria-label="Download Markdown">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => { void ensurePublicAndShare() }} className="icon-btn" title="Share" aria-label="Share">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 text-white/90">
            <div className="stat-card"><div className="stat-label">Modalities</div><div className="stat-value">{info?.counts?.modalities ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Objectives</div><div className="stat-value">{info?.counts?.objectives ?? 0}</div></div>
            <div className="stat-card hidden lg:block"><div className="stat-label">Phases</div><div className="stat-value">{info?.counts?.phases ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Metrics</div><div className="stat-value">{info?.counts?.metrics ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Risks</div><div className="stat-value">{info?.counts?.risks ?? 0}</div></div>
          </div>
        </div>
      </div>

      {showCopied && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-xl border border-white/15 bg-white/10 backdrop-blur-md shadow-2xl text-white/90">Link copied to clipboard</div>
      )}

      {markdown ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-white/80">
              <button
                className={`px-4 py-1.5 rounded-full text-sm ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/70'}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`px-4 py-1.5 rounded-full text-sm ${activeTab === 'full' ? 'bg-white/10 text-white' : 'text-white/70'}`}
                onClick={() => setActiveTab('full')}
              >
                Full Report
              </button>
            </div>
            {activeTab === 'overview' && (
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter sections…"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none"
              />
            )}
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* Confidence & Risk – full width on top */}
              <div className="glass-card p-4 md:p-6">
                <div className="text-white/85 font-medium mb-3">Confidence & Risk</div>
                <div className="flex items-center gap-5">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#7bd88f ${confidencePct}%, rgba(255,255,255,0.12) 0)` }} />
                    <div className="absolute inset-1 rounded-full bg-[rgba(0,0,0,0.35)] border border-white/10 flex items-center justify-center">
                      <div className="text-white font-semibold">{confidencePct}%</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/80 mb-1">On-track Confidence</div>
                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#7bd88f]" style={{ width: `${confidencePct}%` }} />
                    </div>
                    <div className="text-xs text-white/50 mt-1">Derived from report's Executive Summary</div>
                    <div className="mt-4">
                      <div className="text-sm text-white/80 mb-1">Delivery Risk Index</div>
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full" style={{ width: `${riskScore}%`, background: 'linear-gradient(90deg, #ff9f43, #ff6b6b)' }} />
                      </div>
                      <div className="text-xs text-white/50 mt-1">Higher values indicate more risks/unknowns</div>
                    </div>
                  </div>
                </div>
                {/* Tips & Tricks */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-white/80 text-sm font-semibold mb-2">Increase Confidence</div>
                    <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm">
                      {confidenceTips.slice(0,5).map((t, i) => (<li key={i}>{t}</li>))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-white/80 text-sm font-semibold mb-2">Reduce Risk</div>
                    <ul className="list-disc pl-5 space-y-1 text-white/80 text-sm">
                      {riskTips.slice(0,5).map((t, i) => (<li key={i}>{t}</li>))}
                    </ul>
                  </div>
                </div>
                
                {/* Additional Actionable Tips */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/3 border border-white/10">
                  <div className="text-white/90 text-sm font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#7bd88f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Pro Tips for Success
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white/70">
                    <div>
                      <div className="font-medium text-white/85 mb-2">📊 Measurement</div>
                      <ul className="space-y-1">
                        <li>• Set weekly progress check-ins</li>
                        <li>• Use leading indicators, not just lagging</li>
                        <li>• Create visual dashboards for stakeholders</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-white/85 mb-2">🤝 Stakeholders</div>
                      <ul className="space-y-1">
                        <li>• Schedule monthly steering committee meetings</li>
                        <li>• Create RACI matrix for all deliverables</li>
                        <li>• Establish escalation paths early</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-white/85 mb-2">🚀 Execution</div>
                      <ul className="space-y-1">
                        <li>• Start with a 2-week pilot program</li>
                        <li>• Document lessons learned weekly</li>
                        <li>• Plan for 3x the time you think you need</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="glass-card p-4 md:p-6">
                <div className="text-white/85 font-medium mb-4">Quick Navigation</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Full Report', icon: '📋', color: 'from-primary-500/20 to-primary-600/10', action: () => setActiveTab('full') },
                    { name: 'Executive Summary', icon: '📊', color: 'from-blue-500/20 to-blue-600/10', action: () => setActiveTab('full') },
                    { name: 'Organization & Audience', icon: '👥', color: 'from-green-500/20 to-green-600/10', action: () => setActiveTab('full') },
                    { name: 'Business Objectives', icon: '🎯', color: 'from-purple-500/20 to-purple-600/10', action: () => setActiveTab('full') },
                    { name: 'Learning Transfer', icon: '🔄', color: 'from-orange-500/20 to-orange-600/10', action: () => setActiveTab('full') },
                    { name: 'Performance Support', icon: '🛠️', color: 'from-teal-500/20 to-teal-600/10', action: () => setActiveTab('full') },
                    { name: 'Documentation', icon: '📚', color: 'from-indigo-500/20 to-indigo-600/10', action: () => setActiveTab('full') },
                    { name: 'Delivery & Modalities', icon: '🚀', color: 'from-pink-500/20 to-pink-600/10', action: () => setActiveTab('full') },
                    { name: 'Systems & Integration', icon: '🔗', color: 'from-cyan-500/20 to-cyan-600/10', action: () => setActiveTab('full') },
                    { name: 'Resources & Timeline', icon: '⏰', color: 'from-yellow-500/20 to-yellow-600/10', action: () => setActiveTab('full') },
                    { name: 'Risks & Change', icon: '⚠️', color: 'from-red-500/20 to-red-600/10', action: () => setActiveTab('full') },
                    { name: 'Next Steps', icon: '✅', color: 'from-emerald-500/20 to-emerald-600/10', action: () => setActiveTab('full') }
                  ].map((section, index) => (
                    <motion.button
                      key={section.name}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 rounded-xl bg-gradient-to-br ${section.color} border border-white/10 hover:border-white/20 transition-all duration-200 group`}
                      onClick={section.action}
                    >
                      <div className="text-2xl mb-2">{section.icon}</div>
                      <div className="text-white/90 text-xs font-medium leading-tight group-hover:text-white transition-colors">
                        {section.name}
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-white/60 text-xs">
                    Click any section above to view the full report with detailed content
                  </p>
                </div>
              </div>

              {/* New Structured Sections Overview */}
              {/* Executive Summary & Measurement (mirror full report cards) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Executive Summary */}
                <div className="glass-card p-5 overflow-hidden relative">
                  <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(138,182,255,0.35), transparent 60%)' }} />
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l7-7 4 4L21 2"/><path d="M3 22h18"/></svg>
                      Executive Summary
                    </div>
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#7bd88f ${confidencePct}%, rgba(255,255,255,0.12) 0)` }} />
                      <div className="absolute inset-1 rounded-full bg-[rgba(0,0,0,0.35)] border border-white/10 flex items-center justify-center">
                        <div className="text-white text-xs font-semibold">{confidencePct}%</div>
                      </div>
                    </div>
                  </div>
                  {report?.summary.problem_statement && (
                    <p className="text-white/85 text-[0.95rem] leading-relaxed mb-4">{report.summary.problem_statement}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-[11px] text-white/60 mb-1">Current State</div>
                      <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                        {(report?.summary.current_state || []).slice(0,4).map((s, i) => (<li key={i}>{s}</li>))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-[11px] text-white/60 mb-1">Objectives</div>
                      <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                        {(report?.summary.objectives || []).slice(0,4).map((s, i) => (<li key={i}>{s}</li>))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Measurement Framework */}
                <div className="glass-card p-5">
                  <div className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/></svg>
                    Measurement Framework
                  </div>
                  {(report?.measurement.success_metrics?.length || 0) > 0 ? (
                    <div className="space-y-3">
                      {report!.measurement.success_metrics.slice(0,4).map((m, i) => {
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
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-1 gap-6 mt-6">
                <div className="glass-card p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-white/85">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                      <div className="font-medium">Timeline</div>
                    </div>
                    {timelineData.durationLabel && (
                      <div className="px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 text-white/80">{timelineData.durationLabel}</div>
                    )}
                  </div>
                  {timelineData.segments.length ? (
                    <div className="relative h-16 md:h-20 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                      {timelineData.segments.map((s, idx) => (
                        <div key={idx} className="absolute top-0 bottom-0 flex items-center"
                          style={{ left: `${s.left}%`, width: `${s.width}%` }}>
                          <div className="h-full w-full rounded-none" style={{ background: 'linear-gradient(90deg, rgba(138,182,255,0.35), rgba(138,182,255,0.15))', borderRight: '1px solid rgba(255,255,255,0.1)' }} />
                          <div className="absolute inset-0 flex items-center px-2">
                            <div className="text-xs md:text-sm text-white/85 truncate">{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/60 text-sm">No timeline data found. Add dates or phase durations to see schedule visualization.</div>
                  )}

                  {/* Recommendations & Next Steps (Animated Cards) */}
                  <div className="mt-6">
                    <div className="text-white/85 font-medium mb-3">Recommendations & Next Steps</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderTimelineCard(
                        'Short-Term',
                        '1–3 months',
                        [
                          'Stakeholder Alignment: Improve alignment score through targeted engagement',
                          'Competency Prioritization: Finalize framework for prioritizing competencies',
                          'Documentation Gap Analysis: Identify and address critical documentation gaps',
                          'Pilot Design: Develop detailed plan for 10-person pilot implementation',
                        ],
                        '#7bd88f',
                        0
                      )}
                      {renderTimelineCard(
                        'Mid-Term',
                        '3–6 months',
                        [
                          'Manager Enablement: Develop support materials for manager coaching role',
                          'Performance Support Development: Create job aids and checklists for priority areas',
                          'Measurement Framework: Establish baseline data and reporting mechanisms',
                          'Technology Integration Plan: Finalize approach for system integrations',
                        ],
                        '#8AB6FF',
                        1
                      )}
                      {renderTimelineCard(
                        'Long-Term',
                        '6+ months',
                        [
                          'Scaling Strategy: Address identified scaling challenges before full implementation',
                          'Sustainability Plan: Develop approach for ongoing maintenance and updates',
                          'Impact Evaluation: Design comprehensive approach to measuring business impact',
                          'Content Refresh Strategy: Establish cadence for reviewing and updating materials',
                        ],
                        '#FF9F43',
                        2
                      )}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      className="mt-4 glass-card p-4 md:p-6"
                    >
                      <div className="text-white/80 text-sm font-semibold mb-3">Critical Success Factors</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          'Active executive sponsorship',
                          'Clear governance structure',
                          'Adequate resource allocation',
                          'Robust change management approach',
                          'Comprehensive measurement strategy',
                        ].map((c, i) => (
                          <motion.div
                            key={c}
                            initial={{ opacity: 0, x: -6 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.35, delay: 0.05 * i }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/85 text-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#7bd88f]" />
                            <span>{c}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Risk & Learner (mirror full report cards) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Risks & Change Readiness */}
                <div className="glass-card p-5">
                  <div className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z"/></svg>
                    Risks & Change Readiness
                  </div>
                  {(report?.risks.length || 0) > 0 ? (
                    <div>
                      {(() => {
                        const dist = computeRiskDistribution()
                        const total = dist.low + dist.medium + dist.high || 1
                        const lowW = (dist.low/total)*100
                        const medW = (dist.medium/total)*100
                        const highW = (dist.high/total)*100
                        return (
                          <div className="mb-3">
                            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
                              <div style={{ width: `${lowW}%`, background: '#7bd88f' }} />
                              <div style={{ width: `${medW}%`, background: '#ffcc66' }} />
                              <div style={{ width: `${highW}%`, background: '#ff6b6b' }} />
                            </div>
                            <div className="flex gap-3 mt-2 text-[11px] text-white/70">
                              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#7bd88f' }} />Low</span>
                              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ffcc66' }} />Medium</span>
                              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ff6b6b' }} />High</span>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="grid grid-cols-1 gap-2">
                        {report!.risks.slice(0,5).map((r, i) => (
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

                {/* Organization & Audience */}
                <div className="glass-card p-5">
                  <div className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>
                    Organization & Audience
                  </div>
                  {(report?.learner_analysis.profiles.length || 0) > 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="text-xs text-white/60 mb-1">Primary Profile</div>
                        <div className="text-white/85 text-sm">{report!.learner_analysis.profiles[0].segment}</div>
                        {(report!.learner_analysis.profiles[0].roles?.length || 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {report!.learner_analysis.profiles[0].roles.map((r, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {(report!.learner_analysis.readiness_risks.length || 0) > 0 && (
                        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                          <div className="text-xs text-white/60 mb-1">Readiness Risks</div>
                          <ul className="text-white/85 text-sm space-y-1 list-disc pl-4">
                            {report!.learner_analysis.readiness_risks.slice(0,5).map((r, i) => (<li key={i}>{r}</li>))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-white/60 text-sm">No learner profiles available.</div>
                  )}
                </div>
              </div>

              {/* Removed bottom highlight cards per request */}
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="p-4 md:p-8">
                <EnhancedReportDisplay 
                  reportMarkdown={markdown}
                  reportTitle={job.title || 'Needs Analysis Report'}
                  showGeneratedDate={false}
                  starmapJobId={job.id}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-white/60 py-20">
          <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No report data available for this starmap yet.</p>
        </div>
      )}

      <style>{`
        .glass-card { border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); border-radius: 1rem; backdrop-filter: blur(10px); }
        .stat-card { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.8rem; border:1px solid rgba(255,255,255,0.08); border-radius:0.75rem; background: rgba(255,255,255,0.04); }
        .stat-label { font-size: 0.72rem; opacity: 0.7; }
        .stat-value { font-size: 1.15rem; font-weight: 700; }
      `}</style>
    </div>
  )
}


function renderTimelineCard(title: string, subtitle: string, items: string[], accent: string, index: number) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white font-semibold">{title}</div>
          <div className="text-xs px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">{subtitle}</div>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: 0.04 * i }}
              className="flex items-start gap-2"
            >
              <div className="mt-1 w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              <div className="text-white/85 text-sm leading-relaxed">{it}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
