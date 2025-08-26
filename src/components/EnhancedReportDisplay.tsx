import { useState, useMemo, memo } from 'react'
import type { ReactNode } from 'react'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import type { NAReport } from '@/polaris/needs-analysis/report'


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
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  expandable?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(!expandable)
  
  const variantStyles = {
    default: 'border-white/10 bg-white/5',
    primary: 'border-primary-400/20 bg-primary-400/5',
    success: 'border-emerald-400/20 bg-emerald-400/5',
    warning: 'border-amber-400/20 bg-amber-400/5',
    danger: 'border-red-400/20 bg-red-400/5'
  }
  
  const iconBgStyles = {
    default: 'bg-white/10',
    primary: 'bg-primary-400/10',
    success: 'bg-emerald-400/10',
    warning: 'bg-amber-400/10',
    danger: 'bg-red-400/10'
  }
  
  const iconTextStyles = {
    default: 'text-white/70',
    primary: 'text-primary-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400'
  }
  
  return (
    <div className={`rounded-2xl border ${variantStyles[variant]} p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/10`}>
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
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
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

// Timeline component
const Timeline = memo(({ items }: { items: Array<{ label: string; start: string; end: string }> }) => {
  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10" />
      <div className="space-y-6">
        {items.map((item, index) => {
          const startDate = new Date(item.start)
          const endDate = new Date(item.end)
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          
          return (
            <div key={index} className="relative flex items-start gap-4">
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center shadow-lg shadow-primary-400/20">
                <span className="text-white font-bold text-lg">{index + 1}</span>
              </div>
              <div className="flex-1 pt-2">
                <h4 className="text-white/90 font-medium mb-1">{item.label}</h4>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span>{startDate.toLocaleDateString()}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14" />
                  </svg>
                  <span>{endDate.toLocaleDateString()}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-400/10 text-primary-300 text-xs font-medium">
                    {duration} days
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
  showResearchData = true,
  greetingReport,
  orgReport,
  requirementReport,
  prelimReport
}: EnhancedReportDisplayProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(reportTitle)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'research' | 'raw'>('overview')
  
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
      {/* Header */}
      <div className="mb-8">
        <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10">
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
            )}
            <div className="text-sm text-white/60">
              Generated {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
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
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.confidence}%</div>
              <div className="text-xs text-white/60">Confidence</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'overview' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'details' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Detailed Analysis
        </button>
        {showResearchData && (greetingReport || orgReport || requirementReport || prelimReport) && (
          <button
            onClick={() => setActiveTab('research')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'research' 
                ? 'bg-white/10 text-white' 
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Research Data
          </button>
        )}
        <button
          onClick={() => setActiveTab('raw')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'raw' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Raw
        </button>
      </div>
      
      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Grid for primary cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Executive Summary */}
            <DataCard
              title="Executive Summary"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              variant="primary"
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
                    <div className="space-y-2">
                      {report.summary.objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                          <div className="text-white/80">{obj}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DataCard>
            
            {/* Delivery Timeline */}
            {report.delivery_plan?.timeline && report.delivery_plan.timeline.length > 0 && (
              <DataCard
                title="Delivery Timeline"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                variant="success"
              >
                <Timeline items={report.delivery_plan.timeline.filter(t => t.start && t.end) as Array<{label: string; start: string; end: string}>} />
              </DataCard>
            )}

            {/* Delivery Phases (if timeline absent) */}
            {(!report.delivery_plan?.timeline || report.delivery_plan.timeline.length === 0) && report.delivery_plan?.phases?.length > 0 && (
              <DataCard
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
            
            {/* Success Metrics */}
            {report.measurement?.success_metrics && report.measurement.success_metrics.length > 0 && (
              <DataCard
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
            )}
            
            {/* Risk Assessment */}
            {report.risks && report.risks.length > 0 && (
              <DataCard
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
            )}
            </div>
            
            {/* RECOMMENDED SOLUTION SECTION */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recommended Solution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Target Audiences */}
                {report.solution?.target_audiences?.length > 0 && (
                  <DataCard
                    title="Target Audiences"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
                  >
                    <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                      {report.solution.target_audiences.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </DataCard>
                )}

                {/* Delivery Modalities */}
                {report.solution?.delivery_modalities?.length > 0 && (
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
                )}

                {/* Key Competencies */}
                {report.solution?.key_competencies?.length > 0 && (
                  <DataCard
                    title="Key Competencies"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4"/></svg>}
                  >
                    <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                      {report.solution.key_competencies.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </DataCard>
                )}

                {/* Content Outline */}
                {report.solution?.content_outline?.length > 0 && (
                  <DataCard
                    title="Proposed Curriculum Structure"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>}
                  >
                    <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                      {report.solution.content_outline.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </DataCard>
                )}

                {/* Accessibility */}
                {report.solution?.accessibility_and_inclusion?.standards?.length > 0 && (
                  <DataCard
                    title="Accessibility & Inclusion"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                  >
                    <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                      {report.solution.accessibility_and_inclusion.standards.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                    {report.solution.accessibility_and_inclusion.notes && (
                      <p className="text-sm text-white/60 mt-2">{report.solution.accessibility_and_inclusion.notes}</p>
                    )}
                  </DataCard>
                )}
              </div>
            </div>

            {/* LEARNER ANALYSIS SECTION */}
            {(report.learner_analysis?.profiles?.length > 0 || report.learner_analysis?.readiness_risks?.length > 0) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Learner Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {report.learner_analysis.profiles?.length > 0 && (
                    <DataCard
                      title="Learner Profiles"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
                    >
                      <div className="space-y-3 text-sm">
                        {report.learner_analysis.profiles.map((p, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="font-medium text-white/90">{p.segment}</div>
                            <div className="text-white/60 text-xs mt-1">Roles: {p.roles.join(', ')}</div>
                            {p.motivators?.length > 0 && (
                              <div className="text-white/60 text-xs mt-1">Motivators: {p.motivators.join(', ')}</div>
                            )}
                            {p.constraints?.length > 0 && (
                              <div className="text-white/60 text-xs mt-1">Constraints: {p.constraints.join(', ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </DataCard>
                  )}
                  
                  {report.learner_analysis.readiness_risks?.length > 0 && (
                    <DataCard
                      title="Readiness Risks"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
                      variant="warning"
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.learner_analysis.readiness_risks.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </DataCard>
                  )}
                </div>
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
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.technology_talent.technology.current_stack.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        )}
                        {report.technology_talent.technology.gaps?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Gaps</div>
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.technology_talent.technology.gaps.map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
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
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.technology_talent.talent.available_roles.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                        {report.technology_talent.talent.gaps?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Gaps</div>
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.technology_talent.talent.gaps.map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
                          </div>
                        )}
                        {report.technology_talent.talent.recommendations?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Recommendations</div>
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.technology_talent.talent.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {report.measurement.assessment_strategy?.length > 0 && (
                    <DataCard
                      title="Assessment Strategy"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.measurement.assessment_strategy.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </DataCard>
                  )}
                  
                  {report.measurement.data_sources?.length > 0 && (
                    <DataCard
                      title="Data Sources"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>}
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.measurement.data_sources.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </DataCard>
                  )}
                  
                  {report.measurement.learning_analytics && (
                    report.measurement.learning_analytics.levels?.length > 0 || report.measurement.learning_analytics.reporting_cadence
                  ) && (
                    <DataCard
                      title="Learning Analytics"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                    >
                      <div className="space-y-3 text-sm">
                        {report.measurement.learning_analytics.levels?.length > 0 && (
                          <div>
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Levels</div>
                            <ul className="list-disc pl-5 text-white/80 space-y-0.5">
                              {report.measurement.learning_analytics.levels.map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
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
                  )}
                </div>
              </div>
            )}

            {/* BUDGET SECTION */}
            {report.budget && (report.budget.items?.length > 0 || report.budget.notes) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Budget Considerations</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                </div>
              </div>
            )}

            {/* NEXT STEPS */}
            {report.next_steps?.length > 0 && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Next Steps</h3>
                <DataCard
                  title="Recommended Actions"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
                  variant="success"
                >
                  <ol className="list-decimal pl-6 text-sm text-white/80 space-y-2">
                    {report.next_steps.map((step, i) => (
                      <li key={i} className="pl-2">{step}</li>
                    ))}
                  </ol>
                </DataCard>
              </div>
            )}

            {/* ADDITIONAL SECTIONS */}
            {/* Add Current State, Root Causes, Assumptions, Unknowns if they exist */}
            {(report.summary?.current_state?.length > 0 || report.summary?.root_causes?.length > 0 || 
              report.summary?.assumptions?.length > 0 || report.summary?.unknowns?.length > 0) && (
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Additional Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {report.summary.current_state?.length > 0 && (
                    <DataCard
                      title="Current State"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>}
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.summary.current_state.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </DataCard>
                  )}
                  
                  {report.summary.root_causes?.length > 0 && (
                    <DataCard
                      title="Root Causes"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
                      variant="warning"
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.summary.root_causes.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </DataCard>
                  )}
                  
                  {report.summary.assumptions?.length > 0 && (
                    <DataCard
                      title="Assumptions"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.summary.assumptions.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </DataCard>
                  )}
                  
                  {report.summary.unknowns?.length > 0 && (
                    <DataCard
                      title="Unknowns"
                      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                      variant="danger"
                    >
                      <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                        {report.summary.unknowns.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </DataCard>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Show message if no detailed content */}
            {(!report.solution?.target_audiences?.length && 
              !report.solution?.delivery_modalities?.length && 
              !report.solution?.key_competencies?.length && 
              !report.solution?.content_outline?.length && 
              !report.measurement?.success_metrics?.length && 
              !report.next_steps?.length) && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white/60">No detailed analysis available yet.</p>
                <p className="text-white/40 text-sm mt-2">Complete more sections in the wizard to see detailed insights.</p>
              </div>
            )}
            
            {/* Audience / Target audiences */}
            {report.solution?.target_audiences?.length > 0 && (
              <DataCard
                title="Target Audiences"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
                expandable
              >
                <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                  {report.solution.target_audiences.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </DataCard>
            )}

            {/* Delivery Modalities */}
            {report.solution?.delivery_modalities?.length > 0 && (
              <DataCard
                title="Delivery Modalities"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                expandable
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
            )}

            {/* Key Competencies */}
            {report.solution?.key_competencies?.length > 0 && (
              <DataCard
                title="Key Competencies"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4"/></svg>}
                expandable
              >
                <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                  {report.solution.key_competencies.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </DataCard>
            )}

            {/* Content Outline */}
            {report.solution?.content_outline?.length > 0 && (
              <DataCard
                title="Proposed Curriculum Structure"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>}
                expandable
              >
                <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                  {report.solution.content_outline.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </DataCard>
            )}

            {/* Measurement Strategy */}
            {(report.measurement?.success_metrics?.length > 0 || report.measurement?.assessment_strategy?.length > 0) && (
              <DataCard
                title="Measurement Strategy"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V9a2 2 0 012-2h2a2 2 0 012 2v10M7 19h10M7 12h10"/></svg>}
                expandable
              >
                {report.measurement.success_metrics.length > 0 && (
                  <div className="mb-4">
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Success Metrics</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.measurement.success_metrics.map((m, i) => (
                        <MetricCard key={i} metric={typeof m === 'string' ? m : m.metric} baseline={typeof m === 'object' ? m.baseline : null} target={typeof m === 'object' ? m.target : ''} timeframe={typeof m === 'object' ? m.timeframe : ''} />
                      ))}
                    </div>
                  </div>
                )}
                {report.measurement.assessment_strategy.length > 0 && (
                  <div>
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Assessment Strategy</div>
                    <ul className="list-disc pl-6 text-sm text-white/80 space-y-1">
                      {report.measurement.assessment_strategy.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </DataCard>
            )}

            {/* Next Steps */}
            {report.next_steps?.length > 0 && (
              <DataCard
                title="Next Steps"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
                expandable
              >
                <ol className="list-decimal pl-6 text-sm text-white/80 space-y-1">
                  {report.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </DataCard>
            )}
          </div>
        )}
        
        {activeTab === 'research' && showResearchData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {greetingReport && (
              <DataCard
                title="Initial Research"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                expandable
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {greetingReport}
                </div>
              </DataCard>
            )}
            
            {orgReport && (
              <DataCard
                title="Organization Analysis"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                expandable
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {orgReport}
                </div>
              </DataCard>
            )}
            
            {requirementReport && (
              <DataCard
                title="Requirements Analysis"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
                expandable
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {requirementReport}
                </div>
              </DataCard>
            )}
            
            {prelimReport && (
              <DataCard
                title="Preliminary Report"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
                expandable
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {prelimReport}
                </div>
              </DataCard>
            )}
          </div>
        )}
        
        {activeTab === 'raw' && (
          <DataCard
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
          </DataCard>
        )}
      </div>
    </div>
  )
})

EnhancedReportDisplay.displayName = 'EnhancedReportDisplay'

export default EnhancedReportDisplay
