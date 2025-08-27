import { useState, useMemo, memo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import type { NAReport } from '@/polaris/needs-analysis/report'
import { generateShareLink, copyToClipboard, shareLinkNative } from '@/utils/shareUtils'
import { getReportPublicStatus, toggleReportPublicStatus } from '@/services/polarisSummaryService'
import { getStarmapPublicStatus, toggleStarmapPublicStatus } from '@/services/starmapJobsService'


interface EnhancedReportDisplayProps {
  reportMarkdown: string
  reportTitle?: string
  editableTitle?: boolean
  onSaveTitle?: (newTitle: string) => void | Promise<void>
  className?: string
  showResearchData?: boolean
  greetingReport?: string
  orgReport?: string
  requirementReport?: string
  prelimReport?: string
  summaryId?: string // Optional summary ID for share functionality
  starmapJobId?: string // Optional starmap job id for share functionality
  showGeneratedDate?: boolean
  headerActions?: ReactNode
}

// Visual data card component
const DataCard = memo(({ 
  title, 
  icon, 
  children, 
  variant = 'default',
  expandable = false 
}: { 
  title: string
  icon: ReactNode
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'transparent'
  expandable?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(!expandable)
  
  const variantStyles = {
    default: 'border-white/10 bg-white/5',
    primary: 'border-primary-400/20 bg-primary-400/5',
    success: 'border-emerald-400/20 bg-emerald-400/5',
    warning: 'border-amber-400/20 bg-amber-400/5',
    danger: 'border-red-400/20 bg-red-400/5',
    transparent: 'border-transparent bg-transparent'
  }
  
  const iconBgStyles = {
    default: 'bg-white/10',
    primary: 'bg-primary-400/10',
    success: 'bg-emerald-400/10',
    warning: 'bg-amber-400/10',
    danger: 'bg-red-400/10',
    transparent: 'bg-white/10'
  }
  
  const iconTextStyles = {
    default: 'text-white/70',
    primary: 'text-primary-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    transparent: 'text-white/70'
  }
  
  return (
    <div className={`rounded-2xl border ${variantStyles[variant]} p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 h-full flex flex-col`}>
      <div 
        className={`flex items-center gap-3 mb-4 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
      >
        <div className={`w-10 h-10 rounded-xl ${iconBgStyles[variant]} flex items-center justify-center`}>
          <div className={iconTextStyles[variant]}>{icon}</div>
        </div>
        <h3 className="text-base font-semibold text-white/90 flex-1">{title}</h3>
        {expandable && (
          <svg 
            className={`w-5 h-5 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex-1">
          {children}
        </div>
      )}
    </div>
  )
})

DataCard.displayName = 'DataCard'

// Progress indicator component
const ProgressIndicator = memo(({ 
  value, 
  label,
  color = 'primary'
}: { 
  value: number
  label: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
}) => {
  const colorStyles = {
    primary: 'from-primary-400 to-secondary-400',
    success: 'from-emerald-400 to-teal-400',
    warning: 'from-amber-400 to-orange-400',
    danger: 'from-red-400 to-pink-400'
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/90 font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${colorStyles[color]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
})

ProgressIndicator.displayName = 'ProgressIndicator'

// Small grid of card-style items for replacing bullet lists
const ItemGrid = memo(({ items, columns = 2 }: { items: string[]; columns?: number }) => {
  // Use auto-fit to expand cards to fill available space with a sensible min width
  const minWidth = columns <= 1 ? '280px' : columns >= 3 ? '180px' : '220px'
  return (
    <div
      className="grid gap-3 w-full items-stretch"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`, gridAutoRows: 'minmax(48px, auto)' }}
    >
      {items.map((text, i) => (
        <div key={i} className="w-full h-full min-h-[48px] p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 flex items-start">
          {text}
        </div>
      ))}
    </div>
  )
})

ItemGrid.displayName = 'ItemGrid'

// Numbered step cards to replace ordered lists
const StepCards = memo(({ steps }: { steps: string[] }) => (
  <div className="space-y-2 w-full">
    {steps.map((s, i) => (
      <div key={i} className="w-full flex items-start gap-3 px-3.5 py-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 min-h-[48px]">
        <div className="w-6 h-6 rounded-full bg-primary-400/15 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
        <div className="text-sm text-white/80 leading-relaxed flex-1">{s}</div>
      </div>
    ))}
  </div>
))

StepCards.displayName = 'StepCards'

// Timeline component
const Timeline = memo(({ items }: { items: Array<{ label: string; start?: string | null; end?: string | null }> }) => {
  // Helpers
  const dayMs = 1000 * 60 * 60 * 24
  const parse = (v?: string | null) => {
    if (!v) return null
    const t = Date.parse(v)
    return Number.isFinite(t) ? new Date(t) : null
  }
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const clampInclusiveDays = (start?: Date | null, end?: Date | null) => {
    if (!start && !end) return 0
    if (start && !end) return 1
    if (!start && end) return 1
    const a = start as Date
    const b = end as Date
    const diff = Math.round((b.getTime() - a.getTime()) / dayMs)
    return Math.max(1, diff + 1)
  }

  const normalized = items.map((it) => {
    let s = parse(it.start)
    let e = parse(it.end)
    // Swap if out of order
    if (s && e && e.getTime() < s.getTime()) [s, e] = [e, s]
    return { label: it.label, startDate: s, endDate: e }
  })

  // Compute overall range for summary
  const allStarts = normalized.map(n => n.startDate?.getTime()).filter((t): t is number => Number.isFinite(t as number))
  const allEnds = normalized.map(n => n.endDate?.getTime()).filter((t): t is number => Number.isFinite(t as number))
  const overallStart = allStarts.length ? new Date(Math.min(...allStarts)) : (allEnds.length ? new Date(Math.min(...allEnds)) : null)
  const overallEnd = allEnds.length ? new Date(Math.max(...allEnds)) : (allStarts.length ? new Date(Math.max(...allStarts)) : null)
  const overallDays = clampInclusiveDays(overallStart, overallEnd)

  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10" />
      {/* Overall summary */}
      {overallStart && overallEnd && (
        <div className="mb-4 ml-20 text-xs text-white/70 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70">Overall</span>
          <span>{fmt(overallStart)}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14"/></svg>
          <span>{fmt(overallEnd)}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-400/10 text-primary-300">{overallDays} {overallDays === 1 ? 'day' : 'days'}</span>
        </div>
      )}
      <div className="space-y-6">
        {normalized.map((item, index) => {
          const { startDate, endDate } = item
          const isMilestone = (!!startDate && !endDate) || (!!endDate && !startDate) || (startDate && endDate && startDate.toDateString() === endDate.toDateString())
          const dur = clampInclusiveDays(startDate, endDate)
          return (
            <div key={index} className="relative flex items-start gap-4">
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                <span className="text-secondary-900 font-bold text-lg">{index + 1}</span>
              </div>
              <div className="flex-1 pt-2">
                <h4 className="text-white/90 font-medium mb-1">{item.label}</h4>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  {startDate && endDate && !isMilestone && (
                    <>
                      <span>{fmt(startDate)}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14"/></svg>
                      <span>{fmt(endDate)}</span>
                    </>
                  )}
                  {isMilestone && (
                    <>
                      <span>{fmt(startDate || endDate as Date)}</span>
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/70">Milestone</span>
                    </>
                  )}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-400/10 text-primary-300 text-xs font-medium">
                    {dur} {dur === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

Timeline.displayName = 'Timeline'

// Metric card component
const MetricCard = memo(({ 
  metric, 
  baseline, 
  target, 
  timeframe 
}: { 
  metric: string
  baseline?: string | null
  target: string
  timeframe: string
}) => {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
      <div className="space-y-3">
        <h4 className="text-white/90 font-medium text-sm">{metric}</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {baseline && (
            <div>
              <div className="text-white/50 mb-1">Baseline</div>
              <div className="text-white/80 font-medium">{baseline}</div>
            </div>
          )}
          <div>
            <div className="text-white/50 mb-1">Target</div>
            <div className="text-emerald-400 font-medium">{target}</div>
          </div>
          <div>
            <div className="text-white/50 mb-1">Timeline</div>
            <div className="text-white/80 font-medium">{timeframe}</div>
          </div>
        </div>
      </div>
    </div>
  )
})

MetricCard.displayName = 'MetricCard'

// Risk assessment card
const RiskCard = memo(({ 
  risk, 
  mitigation, 
  severity = 'medium' 
}: { 
  risk: string
  mitigation: string
  severity?: 'low' | 'medium' | 'high'
}) => {
  const severityStyles = {
    low: { border: 'border-emerald-400/30', bg: 'bg-emerald-400/5', badge: 'bg-emerald-400/20 text-emerald-300' },
    medium: { border: 'border-amber-400/30', bg: 'bg-amber-400/5', badge: 'bg-amber-400/20 text-amber-300' },
    high: { border: 'border-red-400/30', bg: 'bg-red-400/5', badge: 'bg-red-400/20 text-red-300' }
  }
  
  const styles = severityStyles[severity]
  
  return (
    <div className={`p-4 rounded-xl border ${styles.border} ${styles.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)} Risk
        </span>
      </div>
      <h4 className="text-white/90 font-medium text-sm mb-2">{risk}</h4>
      <div className="text-xs text-white/70">
        <span className="font-medium text-white/80">Mitigation:</span> {mitigation}
      </div>
    </div>
  )
})

RiskCard.displayName = 'RiskCard'

// Main enhanced report display component
const EnhancedReportDisplay = memo(({ 
  reportMarkdown, 
  reportTitle = 'Needs Analysis Report',
  editableTitle = false,
  onSaveTitle,
  className = '',
  showResearchData: _unusedShowResearchData = true,
  greetingReport: _unusedGreetingReport,
  orgReport: _unusedOrgReport,
  requirementReport: _unusedRequirementReport,
  prelimReport: _unusedPrelimReport,
  summaryId,
  starmapJobId,
  showGeneratedDate = true,
  headerActions
}: EnhancedReportDisplayProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(reportTitle)
  // Tabs removed; default to overview-only rendering
  const [showCopySuccess, setShowCopySuccess] = useState(false)

  // Utility to render a responsive grid where the last card spans full width when count is odd
  const renderResponsiveGrid = (nodes: ReactNode[]) => {
    const cards = nodes.filter((n): n is ReactNode => Boolean(n))
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {cards.map((node, idx) => (
          <div key={idx} className={(idx === cards.length - 1 && cards.length % 2 === 1 ? 'lg:col-span-2 ' : '') + 'h-full'}>
            {node}
          </div>
        ))}
      </div>
    )
  }

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
      // Last resort fallback
      const copied = await copyToClipboard(link)
      if (copied) {
        setShowCopySuccess(true)
        setTimeout(() => setShowCopySuccess(false), 2000)
      }
    }
  }, [summaryId, starmapJobId, ensurePublic, titleInput])
  
  // Parse report and filter test data
  const report = useMemo(() => {
    if (!reportMarkdown) return null
    
    let parsedReport: NAReport | null = null
    
    // First try to parse as JSON directly
    try {
      const trimmed = reportMarkdown.trim()
      if (trimmed.startsWith('{')) {
        const jsonReport = JSON.parse(trimmed)
        // Check if it has the expected NAReport structure
        if (jsonReport.summary && jsonReport.solution) {
          parsedReport = jsonReport as NAReport
        }
      }
    } catch (e) {
      // Not JSON, continue with markdown parsing
    }
    
    // If not JSON, try markdown parsing
    if (!parsedReport) {
      const normalizedMarkdown = convertNaJsonStringToMarkdown(reportMarkdown) || reportMarkdown
      parsedReport = parseMarkdownToReport(normalizedMarkdown)
    }
    
    // Filter out test data
    if (parsedReport) {
      const cleanArray = (arr: string[] | undefined): string[] | undefined => {
        if (!arr) return arr
        return arr.filter(item => {
          const lower = item.toLowerCase()
          const isTestData = (lower.includes('this is a test') || 
                              lower.includes('assume value') || 
                              lower.includes('test data') ||
                              lower === 'test' ||
                              lower === 'placeholder')
          return !isTestData
        })
      }
      
      if (parsedReport.solution) {
        parsedReport.solution.key_competencies = cleanArray(parsedReport.solution.key_competencies) || []
        parsedReport.solution.content_outline = cleanArray(parsedReport.solution.content_outline) || []
        parsedReport.solution.target_audiences = cleanArray(parsedReport.solution.target_audiences) || []
      }
      
      if (parsedReport.summary) {
        parsedReport.summary.objectives = cleanArray(parsedReport.summary.objectives) || []
        parsedReport.summary.current_state = cleanArray(parsedReport.summary.current_state) || []
        parsedReport.summary.root_causes = cleanArray(parsedReport.summary.root_causes) || []
      }
    }
    
    return parsedReport
  }, [reportMarkdown])
  
  if (!report) {
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
  
  // Calculate statistics
  const stats = {
    totalObjectives: report.summary?.objectives?.length || 0,
    totalPhases: report.delivery_plan?.phases?.length || 0,
    totalMetrics: report.measurement?.success_metrics?.length || 0,
    totalRisks: report.risks?.length || 0,
    confidence: Math.round((report.summary?.confidence || 0.5) * 100)
  }
  
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
      <div className="mb-8">
        <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 relative overflow-hidden z-30">
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
                className="text-3xl font-bold bg-transparent border-b-2 border-white/30 focus:border-primary-400 outline-none text-white"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between flex-1">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
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
                <div className="flex items-center gap-4">
                  {/* Share Button */}
                  {(summaryId || starmapJobId) && (
                    <div className="relative">
                      <button
                        onClick={handleShare}
                        aria-label="Copy share link"
                        className="w-11 h-11 inline-flex items-center justify-center rounded-full text-primary-300 hover:text-primary-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-400/60 transition"
                        title="Copy link"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="18" cy="6" r="2.5" fill="currentColor" />
                          <circle cx="18" cy="18" r="2.5" fill="currentColor" />
                          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
                          <path d="M8.5 12L15.5 7.5M8.5 12L15.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {/* success toast moved to global fixed position */}
                    </div>
                  )}
                  {showGeneratedDate && (
                    <div className="text-sm text-white/60">
                      Generated {new Date().toLocaleDateString()}
                    </div>
                  )}
                  {headerActions && (
                    <div className="ml-2 flex-shrink-0">{headerActions}</div>
                  )}
                </div>
              </div>
            )}
            {!isEditingTitle && (
              <div className="text-sm text-white/60 ml-auto">
                {/* Date is now inside the flex container above */}
              </div>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalObjectives}</div>
              <div className="text-xs text-white/60">Objectives</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalPhases}</div>
              <div className="text-xs text-white/60">Phases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalMetrics}</div>
              <div className="text-xs text-white/60">Metrics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.totalRisks}</div>
              <div className="text-xs text-white/60">Risks</div>
            </div>
            <div className="text-left md:text-center w-full col-span-2 md:col-span-1 md:hidden">
              <div className="md:hidden w-full">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${stats.confidence}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/70">{stats.confidence}% • Confidence</div>
              </div>
            </div>
          </div>
          {/* Desktop confidence bar below quick stats, matching mobile style */}
          <div className="hidden md:block mt-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${stats.confidence}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-white/70">{stats.confidence}% • Confidence</div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation removed for simplified single-view rendering */}
      
      {/* Content (always show overview) */}
      <div className="space-y-6">
        <div className="space-y-6">
            {/* Executive Summary - full width */}
            <DataCard
              key="exec-summary"
              title="Executive Summary"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              variant="transparent"
            >
              <div className="space-y-4 text-sm">
                {report.summary?.problem_statement && (
                  <div>
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Problem Statement</div>
                    <div className="text-white/90">{report.summary.problem_statement}</div>
                  </div>
                )}
                {report.summary?.objectives && report.summary.objectives.length > 0 && (
                  <div>
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Key Objectives</div>
                    <ItemGrid items={report.summary.objectives} columns={2} />
                  </div>
                )}
              </div>
            </DataCard>

            {/* Implementation Roadmap - placed directly below Executive Summary */}
            {(report.delivery_plan?.phases?.length || 0) > 0 && (
              <DataCard
                key="phases"
                title="Implementation Roadmap"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                }
                variant="success"
              >
                <div className="space-y-3">
                  {report.delivery_plan.phases.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between text-sm text-white/80">
                        <span className="font-medium">{p.name}</span>
                        {p.duration_weeks ? (
                          <span className="text-white/60">{p.duration_weeks} weeks</span>
                        ) : null}
                      </div>
                      {p.goals?.length > 0 && (
                        <div className="mt-2 text-xs text-white/70">
                          <div className="text-white/60 mb-1">Goals</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {p.goals.map((g, idx) => <li key={idx}>{g}</li>)}
                          </ul>
                        </div>
                      )}
                      {p.activities?.length > 0 && (
                        <div className="mt-2 text-xs text-white/70">
                          <div className="text-white/60 mb-1">Activities</div>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {p.activities.map((a, idx) => <li key={idx}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DataCard>
            )}

            {/* Grid for remaining primary cards */}
            {renderResponsiveGrid([
              (((report.delivery_plan?.timeline?.length || 0) > 0)) ? (
                <DataCard
                  key="timeline"
                  title="Delivery Timeline"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  variant="success"
                >
                  <Timeline items={report.delivery_plan.timeline.filter(t => (t.start || t.end)) as Array<{label: string; start?: string | null; end?: string | null}>} />
                </DataCard>
              ) : null,
              (report.measurement?.success_metrics && report.measurement.success_metrics.length > 0) ? (
                <DataCard
                  key="metrics"
                  title="Success Metrics"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                >
                  <div className="space-y-3">
                    {report.measurement.success_metrics.slice(0, 3).map((metric, i) => (
                      <MetricCard
                        key={i}
                        metric={typeof metric === 'string' ? metric : metric.metric}
                        baseline={typeof metric === 'object' ? metric.baseline : null}
                        target={typeof metric === 'object' ? metric.target : ''}
                        timeframe={typeof metric === 'object' ? metric.timeframe : ''}
                      />
                    ))}
                  </div>
                </DataCard>
              ) : null,
              (report.risks && report.risks.length > 0) ? (
                <DataCard
                  key="risks"
                  title="Risk Assessment"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                  variant="warning"
                >
                  <div className="space-y-3">
                    {report.risks.map((risk, i) => (
                      <RiskCard
                        key={i}
                        risk={risk.risk}
                        mitigation={risk.mitigation}
                        severity={risk.severity as 'low' | 'medium' | 'high'}
                      />
                    ))}
                  </div>
                </DataCard>
              ) : null,
            ])}
            
            {/* RECOMMENDED SOLUTION SECTION */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recommended Solution</h3>
              {renderResponsiveGrid([
                report.solution?.target_audiences?.length > 0 ? (
                  <DataCard
                    title="Target Audiences"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
                  >
                    <ItemGrid items={report.solution.target_audiences} columns={2} />
                  </DataCard>
                ) : null,

                report.solution?.delivery_modalities?.length > 0 ? (
                  <DataCard
                    title="Delivery Modalities"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                  >
                    <ul className="space-y-2 text-sm text-white/80">
                      {report.solution.delivery_modalities.map((m, i) => (
                        <li key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="font-medium">{m.modality}</div>
                          {m.reason && <div className="text-white/60 text-xs mt-1">{m.reason}</div>}
                        </li>
                      ))}
                    </ul>
                  </DataCard>
                ) : null,

                report.solution?.key_competencies?.length > 0 ? (
                  <DataCard
                    title="Key Competencies"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4"/></svg>}
                  >
                    <ItemGrid items={report.solution.key_competencies} columns={3} />
                  </DataCard>
                ) : null,

                report.solution?.content_outline?.length > 0 ? (
                  <DataCard
                    title="Proposed Curriculum Structure"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>}
                  >
                    <ItemGrid items={report.solution.content_outline} columns={2} />
                  </DataCard>
                ) : null,

                report.solution?.accessibility_and_inclusion?.standards?.length > 0 ? (
                  <DataCard
                    title="Accessibility & Inclusion"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                  >
                    <ItemGrid items={report.solution.accessibility_and_inclusion.standards} columns={2} />
                    {report.solution.accessibility_and_inclusion.notes && (
                      <p className="text-sm text-white/60 mt-2">{report.solution.accessibility_and_inclusion.notes}</p>
                    )}
                  </DataCard>
                ) : null,
              ])}
            </div>

            {/* LEARNER ANALYSIS SECTION */}
            {(report.learner_analysis?.profiles?.length > 0 || report.learner_analysis?.readiness_risks?.length > 0) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Learner Analysis</h3>
                {renderResponsiveGrid([
                  report.learner_analysis.profiles?.length > 0 && (
                    <DataCard
                      title="Learner Profiles"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {report.learner_analysis.profiles.map((p, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="font-medium text-white/90 mb-1">{p.segment}</div>
                            <div className="text-white/70 text-xs">Roles: {p.roles.join(', ') || '—'}</div>
                            {p.motivators?.length > 0 && (
                              <div className="text-white/70 text-xs">Motivators: {p.motivators.join(', ')}</div>
                            )}
                            {p.constraints?.length > 0 && (
                              <div className="text-white/70 text-xs">Constraints: {p.constraints.join(', ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </DataCard>
                  ) || null,
                  report.learner_analysis.readiness_risks?.length > 0 ? (
                    <DataCard
                      title="Readiness Risks"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
                      variant="warning"
                    >
                      <ItemGrid items={report.learner_analysis.readiness_risks} columns={2} />
                    </DataCard>
                  ) : null,
                ])}
              </div>
            )}

            {/* TECHNOLOGY & TALENT SECTION */}
            {(report.technology_talent?.technology || report.technology_talent?.talent) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Technology & Talent Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Technology */}
                  {report.technology_talent.technology && (
                    <DataCard
                      title="Technology Stack"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                    >
                      <div className="space-y-3 text-sm">
                        {report.technology_talent.technology.current_stack?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Current Stack</div>
                            <ItemGrid items={report.technology_talent.technology.current_stack} columns={2} />
                          </div>
                        )}
                        {report.technology_talent.technology.gaps?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Gaps</div>
                            <ItemGrid items={report.technology_talent.technology.gaps} columns={2} />
                          </div>
                        )}
                        {report.technology_talent.technology.recommendations?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Recommendations</div>
                            <ul className="space-y-1">
                              {report.technology_talent.technology.recommendations.map((r, i) => (
                                <li key={i} className="text-white/80">
                                  <span className="font-medium">{r.capability}</span>
                                  <span className="text-white/60 text-xs"> — {r.fit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </DataCard>
                  )}

                  {/* Talent */}
                  {report.technology_talent.talent && (
                    <DataCard
                      title="Talent Requirements"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
                    >
                      <div className="space-y-3 text-sm">
                        {report.technology_talent.talent.available_roles?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Available Roles</div>
                            <ItemGrid items={report.technology_talent.talent.available_roles} columns={2} />
                          </div>
                        )}
                        {report.technology_talent.talent.gaps?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Gaps</div>
                            <ItemGrid items={report.technology_talent.talent.gaps} columns={2} />
                          </div>
                        )}
                        {report.technology_talent.talent.recommendations?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Recommendations</div>
                            <ItemGrid items={report.technology_talent.talent.recommendations} columns={2} />
                          </div>
                        )}
                      </div>
                    </DataCard>
                  )}
                </div>
              </div>
            )}

            {/* MEASUREMENT & ASSESSMENT */}
            {(report.measurement?.assessment_strategy?.length > 0 || report.measurement?.data_sources?.length > 0 || report.measurement?.learning_analytics) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Measurement & Assessment</h3>
                {renderResponsiveGrid([
                  report.measurement.assessment_strategy?.length > 0 && (
                    <DataCard
                      title="Assessment Strategy"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}
                    >
                      <ItemGrid items={report.measurement.assessment_strategy} columns={2} />
                    </DataCard>
                  ) || null,
                  
                  report.measurement.data_sources?.length > 0 ? (
                    <DataCard
                      title="Data Sources"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>}
                    >
                      <ItemGrid items={report.measurement.data_sources} columns={2} />
                    </DataCard>
                  ) : null,
                  
                  (report.measurement.learning_analytics && (
                    report.measurement.learning_analytics.levels?.length > 0 || report.measurement.learning_analytics.reporting_cadence
                  )) ? (
                    <DataCard
                      title="Learning Analytics"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                    >
                      <div className="space-y-3 text-sm">
                        {report.measurement.learning_analytics.levels?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Levels</div>
                            <ItemGrid items={report.measurement.learning_analytics.levels} columns={3} />
                          </div>
                        )}
                        {report.measurement.learning_analytics.reporting_cadence && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Reporting Cadence</div>
                            <div className="text-white/80">{report.measurement.learning_analytics.reporting_cadence}</div>
                          </div>
                        )}
                      </div>
                    </DataCard>
                  ) : null,
                ])}
              </div>
            )}

            {/* BUDGET SECTION */}
            {report.budget && (report.budget.items?.length > 0 || report.budget.notes) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Budget Considerations</h3>
                {renderResponsiveGrid([
                  (
                  <DataCard
                    title="Budget Breakdown"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    variant="primary"
                  >
                    <div className="space-y-3 text-sm">
                      <div className="text-white/60 text-xs uppercase tracking-wider">Currency: {report.budget.currency || 'USD'}</div>
                      {report.budget.items?.length > 0 && (
                        <div className="space-y-2">
                          {report.budget.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded bg-white/5">
                              <span className="text-white/80">{item.item}</span>
                              <span className="text-white/60 text-xs">{item.low} - {item.high}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {report.budget.notes && (
                        <div className="text-white/60 text-xs">{report.budget.notes}</div>
                      )}
                    </div>
                  </DataCard>
                  )
                ])}
              </div>
            )}

            {/* NEXT STEPS */}
            {report.next_steps?.length > 0 && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Next Steps</h3>
                {renderResponsiveGrid([
                  (
                    <DataCard
                      title="Recommended Actions"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
                      variant="success"
                    >
                      <StepCards steps={report.next_steps} />
                    </DataCard>
                  )
                ])}
              </div>
            )}

            {/* ADDITIONAL SECTIONS */}
            {/* Add Current State, Root Causes, Assumptions, Unknowns if they exist */}
            {(report.summary?.current_state?.length > 0 || report.summary?.root_causes?.length > 0 || 
              report.summary?.assumptions?.length > 0 || report.summary?.unknowns?.length > 0) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Additional Analysis</h3>
                {renderResponsiveGrid([
                  report.summary.current_state?.length > 0 && (
                    <DataCard
                      title="Current State"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>}
                    >
                      <ItemGrid items={report.summary.current_state} columns={2} />
                    </DataCard>
                  ) || null,
                  
                  report.summary.root_causes?.length > 0 ? (
                    <DataCard
                      title="Root Causes"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
                      variant="warning"
                    >
                      <ItemGrid items={report.summary.root_causes} columns={2} />
                    </DataCard>
                  ) : null,
                  
                  report.summary.assumptions?.length > 0 ? (
                    <DataCard
                      title="Assumptions"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    >
                      <ItemGrid items={report.summary.assumptions} columns={2} />
                    </DataCard>
                  ) : null,
                  
                  report.summary.unknowns?.length > 0 ? (
                    <DataCard
                      title="Unknowns"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                      variant="danger"
                    >
                      <ItemGrid items={report.summary.unknowns} columns={2} />
                    </DataCard>
                  ) : null,
                ])}
              </div>
            )}
          </div>
        
        {/* details section removed */}
        
        
        {/* research section removed */}
        
        {/* raw section removed */}
        {/*  <DataCard
            title="Raw Report Content"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            }
            expandable
          >
            <div className="max-h-96 overflow-y-auto">
              <pre className="text-xs text-white/70 whitespace-pre-wrap break-words font-mono">
                {(() => {
                  try {
                    // If it's JSON, format it nicely
                    const trimmed = reportMarkdown?.trim()
                    if (trimmed?.startsWith('{')) {
                      return JSON.stringify(JSON.parse(trimmed), null, 2)
                    }
                  } catch {}
                  // Otherwise show as-is
                  return reportMarkdown || 'No report content available'
                })()}
              </pre>
            </div>
          </DataCard> */}
      </div>
    </div>
  )
})

EnhancedReportDisplay.displayName = 'EnhancedReportDisplay'

export default EnhancedReportDisplay
