import { useMemo, useState } from 'react'
import type { StarmapJob } from '@/services/starmapJobsService'
import { parseMarkdownToReport } from '@/polaris/needs-analysis/parse'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import type { NAReport } from '@/polaris/needs-analysis/report'

type EnhancedStarmapCardProps = {
  job: StarmapJob
  onView?: (jobId: string) => void
  onResume?: (jobId: string) => void
  onDelete?: (jobId: string) => void
  deleting?: boolean
}

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

// Material UI-style icons
const Icons = {
  Timeline: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2z"/>
    </svg>
  ),
  Metrics: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
    </svg>
  ),
  Risk: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L1 21h22L12 2zm0 3.83L19.53 19H4.47L12 5.83zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
    </svg>
  )
}

function useProgress(job: StarmapJob): number {
  if (typeof job.report_job_progress === 'number' && !Number.isNaN(job.report_job_progress)) {
    return Math.max(0, Math.min(100, job.report_job_progress))
  }
  const steps = [job.stage1_complete, job.stage2_complete, job.stage3_complete, job.dynamic_complete, Boolean(job.final_report)]
  const completed = steps.filter(Boolean).length
  return Math.round((completed / steps.length) * 100)
}

function getStatusConfig(status: StarmapJob['status'] | string) {
  switch (status) {
    case 'completed':
      return { 
        text: 'Completed', 
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        borderColor: 'border-green-400/30',
        icon: Icons.CheckCircle
      }
    case 'processing':
    case 'queued':
      return { 
        text: status === 'queued' ? 'Queued' : 'Processing', 
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        borderColor: 'border-amber-400/30',
        icon: Icons.Clock
      }
    case 'failed':
      return { 
        text: 'Failed', 
        color: 'text-red-400',
        bgColor: 'bg-red-400/10',
        borderColor: 'border-red-400/30',
        icon: Icons.Warning
      }
    default:
      return { 
        text: 'In Progress', 
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        borderColor: 'border-blue-400/30',
        icon: Icons.Clock
      }
  }
}

export function EnhancedStarmapCard({ job, onView, onResume, onDelete, deleting }: EnhancedStarmapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const progressPct = useProgress(job)
  const statusConfig = getStatusConfig(job.status)
  const StatusIcon = statusConfig.icon
  
  // Parse report data (JSON-first, then markdown)
  const reportSource = job.final_report || job.preliminary_report || ''
  const parsed = useMemo(() => {
    if (!reportSource) return null
    // Attempt direct JSON parse
    try {
      const trimmed = reportSource.trim()
      if (trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed)
        if (json && (json as any).summary && (json as any).solution) {
          return json as NAReport
        }
      }
    } catch {}
    // Try converting JSON-like string to markdown first
    try {
      const md = convertNaJsonStringToMarkdown(reportSource)
      if (md) return parseMarkdownToReport(md)
    } catch {}
    // Fallback: treat as markdown
    try {
      return parseMarkdownToReport(reportSource)
    } catch {
      return null
    }
  }, [reportSource])
  
  // Extract timeline data
  const timelineData = useMemo(() => {
    const phases = parsed?.delivery_plan?.phases || []
    const timeline = parsed?.delivery_plan?.timeline || []
    
    if (phases.length > 0) {
      return phases.slice(0, 5).map((p: any, idx: number) => ({
        id: idx,
        name: p.name || `Phase ${idx + 1}`,
        duration: p.duration_weeks || 4,
        status: idx === 0 ? 'active' : idx < 2 ? 'upcoming' : 'future',
        description: p.description || ''
      }))
    }
    
    if (timeline.length > 0) {
      return timeline.slice(0, 5).map((t: any, idx: number) => ({
        id: idx,
        name: t.label || `Milestone ${idx + 1}`,
        duration: 4,
        status: idx === 0 ? 'active' : 'upcoming',
        startDate: t.start,
        endDate: t.end
      }))
    }
    
    // Fallback
    return [
      { id: 0, name: 'Discovery', duration: 2, status: 'active' },
      { id: 1, name: 'Design', duration: 4, status: 'upcoming' },
      { id: 2, name: 'Development', duration: 8, status: 'future' },
      { id: 3, name: 'Deployment', duration: 2, status: 'future' }
    ]
  }, [parsed])
  
  // Extract metrics data
  const metricsData = useMemo(() => {
    const metrics = parsed?.measurement?.success_metrics || []
    if (metrics.length > 0) {
      return metrics.slice(0, 3).map((m: any) => {
        // Extract numeric values from strings like "85%" or "85"
        const extractNumber = (str: string | null | undefined): number => {
          if (!str) return 0
          const match = String(str).match(/(\d+(?:\.\d+)?)/)
          return match ? parseFloat(match[1]) : 0
        }
        
        const baselineValue = extractNumber(m.baseline)
        const targetValue = extractNumber(m.target) || 100
        
        // Calculate a realistic current value (between baseline and target)
        // In production, this would come from actual tracking data
        const progress = job.status === 'completed' ? 0.8 : 0.3 // Mock progress
        const currentValue = Math.round(baselineValue + (targetValue - baselineValue) * progress)
        
        return {
          title: m.metric || 'Metric',
          current: currentValue,
          target: targetValue,
          baseline: baselineValue,
          unit: String(m.target || '').includes('%') ? '%' : '',
          timeframe: m.timeframe || 'Q4 2024'
        }
      })
    }
    // Return empty array instead of fallback data
    return []
  }, [parsed, job.status])
  
  // Extract risks data
  const risksData = useMemo(() => {
    const risks = [...(parsed?.risks || []), ...(parsed?.learner_analysis?.readiness_risks || [])]
    if (risks.length > 0) {
      return risks.slice(0, 4).map((r: any) => {
        const title = typeof r === 'string' ? r : (r.risk || 'Risk')
        const sevFromData = typeof r === 'object' ? (r.severity as 'high' | 'medium' | 'low' | undefined) : undefined
        const textForHeuristic = (typeof r === 'string' ? r : (r.risk || '')).toLowerCase()
        
        // Determine severity from data or heuristics
        let severity: 'high' | 'medium' | 'low' = sevFromData || 'medium'
        if (!sevFromData) {
          if (textForHeuristic.includes('critical') || textForHeuristic.includes('severe') || 
              textForHeuristic.includes('no internal') || textForHeuristic.includes('readiness')) {
            severity = 'high'
          } else if (textForHeuristic.includes('limitation') || textForHeuristic.includes('constraint') || 
                     textForHeuristic.includes('resource')) {
            severity = 'medium'
          } else if (textForHeuristic.includes('change') || textForHeuristic.includes('resistance')) {
            severity = 'low'
          }
        }
        
        // More realistic impact percentages
        const impact = severity === 'high' ? 75 : severity === 'medium' ? 50 : 30
        
        return {
          title,
          severity,
          impact,
          mitigation: typeof r === 'object' ? r.mitigation : null
        }
      })
    }
    // Return empty array instead of fallback data
    return []
  }, [parsed])
  
  const totalDuration = timelineData.reduce((sum, phase) => sum + phase.duration, 0)
  
  return (
    <div className="group relative glass-card rounded-2xl p-6 border border-white/10 hover:border-primary-400/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-400/10">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-xl font-heading font-bold text-white mb-2 flex items-center gap-3">
            {job.title || 'Untitled Starmap'}
            <span className={classNames(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
              statusConfig.bgColor, statusConfig.color, statusConfig.borderColor, 'border'
            )}>
              <StatusIcon />
              {statusConfig.text}
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Icons.Clock />
              Created: {new Date(job.created_at).toLocaleDateString()}
            </span>
            {job.completed_at && (
              <span className="flex items-center gap-1.5">
                <Icons.CheckCircle />
                Completed: {new Date(job.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Progress Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="url(#progress-gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(progressPct / 100) * 226} 226`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7dadb" />
                <stop offset="100%" stopColor="#7bc5c7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        
        {/* Timeline Section */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Timeline />
            <h4 className="font-heading font-semibold text-white">Timeline</h4>
            <span className="ml-auto text-xs text-white/60">{totalDuration} weeks</span>
          </div>
          
          <div className="space-y-3">
            {timelineData.slice(0, 3).map((phase, idx) => (
              <div key={phase.id} className="relative">
                {idx < timelineData.length - 1 && (
                  <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gradient-to-b from-primary-400/50 to-transparent" />
                )}
                
                <div className="flex items-start gap-3">
                  <div className={classNames(
                    'mt-1 w-4 h-4 rounded-full border-2 transition-all duration-500',
                    phase.status === 'active' 
                      ? 'bg-primary-400 border-primary-400 shadow-lg shadow-primary-400/50 animate-pulse' 
                      : phase.status === 'upcoming'
                      ? 'bg-white/20 border-primary-400/50'
                      : 'bg-transparent border-white/30'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-white truncate">{phase.name}</h5>
                      <span className="text-xs text-white/50">{phase.duration}w</span>
                    </div>
                    
                    {/* Progress bar for phase */}
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={classNames(
                          'h-full rounded-full transition-all duration-1000',
                          phase.status === 'active' 
                            ? 'bg-gradient-to-r from-primary-400 to-primary-500 animate-pulse'
                            : 'bg-white/20'
                        )}
                        style={{ 
                          width: phase.status === 'active' ? '60%' : phase.status === 'upcoming' ? '0%' : '0%',
                          animation: phase.status === 'active' ? 'progress 2s ease-in-out infinite' : 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {timelineData.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <span>+{timelineData.length - 3} more phases</span>
              </button>
            )}
          </div>
        </div>

                    {/* Success Metrics Section */}
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Metrics />
                <h4 className="font-heading font-semibold text-white">Success Metrics</h4>
              </div>
              
              {metricsData.length > 0 ? (
                <div className="space-y-4">
                  {metricsData.map((metric, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-sm font-medium text-white">{metric.title}</h5>
                        <span className="text-xs text-white/70 font-medium">
                          {metric.current}{metric.unit} / {metric.target}{metric.unit}
                        </span>
                      </div>
                      
                      {/* Enhanced progress bar with baseline */}
                      <div className="relative h-3 bg-white/5 rounded-full border border-white/10 overflow-visible">
                        {/* Background segments for visual reference */}
                        <div className="absolute inset-0 flex rounded-full overflow-hidden">
                          <div className="flex-1 border-r border-white/10" />
                          <div className="flex-1" />
                        </div>
                        
                        {/* Baseline indicator (if different from 0) */}
                        {metric.baseline > 0 && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-20"
                            style={{ left: `${(metric.baseline / metric.target) * 100}%` }}
                          >
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-white/50 whitespace-nowrap">
                              Baseline: {metric.baseline}%
                            </div>
                          </div>
                        )}
                        
                        {/* Current progress bar */}
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-400/80 to-primary-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(100, (metric.current / metric.target) * 100)}%` }}
                        />
                        
                        {/* Current value indicator */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full shadow-lg z-30 transition-all duration-1000"
                          style={{ left: `calc(${Math.min(100, (metric.current / metric.target) * 100)}% - 2px)` }}
                        />
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center text-[10px] text-white/50">
                        <span>Baseline: {metric.baseline}%</span>
                        <span className="text-primary-300">{metric.timeframe}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/40 text-center py-4">
                  No metrics data available
                </div>
              )}
            </div>

                    {/* Risk Analysis Section */}
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Risk />
                <h4 className="font-heading font-semibold text-white">Risk Analysis</h4>
              </div>
              
              {risksData.length > 0 ? (
                <div className="space-y-3">
                  {risksData.slice(0, 3).map((risk, idx) => (
                    <div key={idx} className="relative bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-start gap-3">
                        {/* Severity indicator */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={classNames(
                            'w-2 h-2 rounded-full',
                            risk.severity === 'high' ? 'bg-red-400 animate-pulse shadow-lg shadow-red-400/50' :
                            risk.severity === 'medium' ? 'bg-amber-400 shadow-lg shadow-amber-400/30' :
                            'bg-green-400 shadow-lg shadow-green-400/30'
                          )} />
                          <span className={classNames(
                            'text-[9px] font-medium uppercase tracking-wider',
                            risk.severity === 'high' ? 'text-red-400' :
                            risk.severity === 'medium' ? 'text-amber-400' :
                            'text-green-400'
                          )}>
                            {risk.severity}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-white mb-2">{risk.title}</h5>
                          
                          {/* Impact visualization */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-white/60 font-medium">Impact</span>
                            <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                              <div 
                                className={classNames(
                                  'h-full rounded-full transition-all duration-1000',
                                  risk.severity === 'high' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                  risk.severity === 'medium' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                  'bg-gradient-to-r from-green-500 to-green-400'
                                )}
                                style={{ width: `${risk.impact}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-white/70 font-medium min-w-[30px] text-right">
                              {risk.impact}%
                            </span>
                          </div>
                          
                          {risk.mitigation && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-[11px] text-white/70">
                                <span className="font-medium text-white/80">Mitigation:</span> {risk.mitigation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {risksData.length > 3 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="w-full text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center gap-1 py-2"
                    >
                      <span>+{risksData.length - 3} more risks</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/40 text-center py-4">
                  No risk data available
                </div>
              )}
            </div>
      </div>

      {/* Stage Progress Indicators */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'Stage 1', complete: job.stage1_complete },
          { key: 'Stage 2', complete: job.stage2_complete },
          { key: 'Stage 3', complete: job.stage3_complete },
          { key: 'Dynamic', complete: job.dynamic_complete },
          { key: 'Final', complete: Boolean(job.final_report) },
        ].map((stage) => (
          <div
            key={stage.key}
            className={classNames(
              'flex-1 h-1.5 rounded-full overflow-hidden transition-all duration-500',
              stage.complete ? 'bg-gradient-to-r from-primary-400 to-primary-500' : 'bg-white/10'
            )}
            title={`${stage.key}: ${stage.complete ? 'Complete' : 'Pending'}`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === 'completed' && job.final_report && (
            <button
              onClick={() => onView?.(job.id)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-secondary-400 to-secondary-500 text-white font-medium hover:shadow-lg hover:shadow-secondary-400/30 transform hover:scale-105 transition-all duration-300"
            >
              View Full Report
            </button>
          )}
          
          {job.status !== 'completed' && (
            <button
              onClick={() => onResume?.(job.id)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-secondary-400 to-secondary-500 text-white font-medium hover:shadow-lg hover:shadow-secondary-400/30 transform hover:scale-105 transition-all duration-300"
            >
              {job.status === 'draft' ? 'Resume' : 'Check Status'}
            </button>
          )}
        </div>
        
        <button
          onClick={() => onDelete?.(job.id)}
          disabled={deleting}
          className="p-2 text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete starmap"
        >
          {deleting ? (
            <div className="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default EnhancedStarmapCard
