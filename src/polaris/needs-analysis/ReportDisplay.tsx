// src/polaris/needs-analysis/ReportDisplay.tsx
// Enhanced UX version with improved readability, scanability, and actionability
import { useState, useCallback, useMemo, memo } from 'react'
import { parseMarkdownToReport } from './parse'

interface ReportDisplayProps {
  reportMarkdown: string
  reportTitle?: string
  editableTitle?: boolean
  savingTitle?: boolean
  onSaveTitle?: (newTitle: string) => void | Promise<void>
  className?: string
}

// PriorityBadge component for risk assessment
const PriorityBadge = memo(({ level }: { level: 'high' | 'medium' | 'low' }) => {
  const getBadgeStyles = () => {
    switch (level) {
      case 'high':
        return 'bg-red-500/30 text-red-200 border-red-400/40'
      case 'medium':
        return 'bg-amber-500/20 text-amber-200 border-amber-400/30'
      case 'low':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/30'
    }
  }

  const getLabel = () => {
    switch (level) {
      case 'high':
        return 'High Priority'
      case 'medium':
        return 'Medium Priority'
      case 'low':
        return 'Low Priority'
      default:
        return 'Unknown Priority'
    }
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyles()}`}>
      {getLabel()}
    </span>
  )
})

PriorityBadge.displayName = 'PriorityBadge'

// Risk severity detection function
const detectRiskSeverity = (riskText: string): 'high' | 'medium' | 'low' => {
  const highRiskKeywords = ['critical', 'severe', 'high risk', 'urgent', 'immediate', 'blocker', 'fatal', 'catastrophic']
  const mediumRiskKeywords = ['moderate', 'medium', 'attention', 'concern', 'warning', 'caution']
  
  const text = riskText.toLowerCase()
  if (highRiskKeywords.some(keyword => text.includes(keyword))) return 'high'
  if (mediumRiskKeywords.some(keyword => text.includes(keyword))) return 'medium'
  return 'low'
}

// Memoized Icon component for better performance
const Icon = memo(({ name, className = 'w-4 h-4' }: { 
  name: 'summary' | 'solution' | 'delivery' | 'metrics' | 'timeline' | 'steps' | 'risks' | 'audience' | 'modality' | 'tech' | 'doc' | 'blend' | 'online' | 'workshop' | 'coach' | 'toolbox' | 'check' | 'database' | 'assessment' | 'target'
  className?: string 
}) => {
  const iconMap = {
    summary: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/></svg>
    ),
    solution: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M5.22 5.22 8 8"/><path d="M2 12h4"/><path d="M5.22 18.78 8 16"/><path d="M12 22v-4"/><path d="M18.78 18.78 16 16"/><path d="M22 12h-4"/><path d="M18.78 5.22 16 8"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    delivery: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v6H3z"/><path d="M3 9l3 12h12l3-12"/><path d="M9 12h6"/></svg>
    ),
    metrics: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15v3"/><path d="M11 11v7"/><path d="M15 7v11"/><path d="M19 12v6"/></svg>
    ),
    timeline: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
    ),
    steps: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    ),
    risks: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
    audience: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-2-2"/><path d="M16 16l2 2"/></svg>
    ),
    modality: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M5.22 5.22 8 8"/><path d="M2 12h4"/><path d="M5.22 18.78 8 16"/><path d="M12 22v-4"/><path d="M18.78 18.78 16 16"/><path d="M22 12h-4"/><path d="M18.78 5.22 16 8"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    tech: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    ),
    doc: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
    ),
    blend: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M5.22 5.22 8 8"/><path d="M2 12h4"/><path d="M5.22 18.78 8 16"/><path d="M12 22v-4"/><path d="M18.78 18.78 16 16"/><path d="M22 12h-4"/><path d="M18.78 5.22 16 8"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    online: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    ),
    workshop: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M21 3v6"/><path d="M3 3v6"/><path d="M21 9v6"/><path d="M3 9v6"/></svg>
    ),
    coach: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
    toolbox: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
    ),
    check: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
    ),
    database: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
    ),
    assessment: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c-1 9-4 9-9 9s-8 0-9-9"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 2.88L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    ),
    target: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    )
  }

  return iconMap[name] || null
})

Icon.displayName = 'Icon'

// Memoized ReportDisplay component for better performance
const ReportDisplay = memo(({ reportMarkdown, reportTitle, editableTitle = false, savingTitle = false, onSaveTitle, className = '' }: ReportDisplayProps) => {
  // Memoize parsed report to prevent recalculation
  const report = useMemo(() => parseMarkdownToReport(reportMarkdown), [reportMarkdown])
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [titleInput, setTitleInput] = useState<string>(reportTitle || 'Needs Analysis Report')
  
  // removed legacy HTML sanitizer; summary now renders via structured JSX

  // Memoize title save handler
  const handleTitleSave = useCallback(async () => {
    if (onSaveTitle) {
      await onSaveTitle(titleInput)
    }
    setIsEditingTitle(false)
  }, [titleInput, onSaveTitle])

  // Memoize title edit handler
  const handleTitleEdit = useCallback(() => {
    setIsEditingTitle(true)
  }, [])

  // Memoize title input change handler
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleInput(e.target.value)
  }, [])

  // Memoize title key down handler
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleTitleSave()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setTitleInput(reportTitle || 'Needs Analysis Report')
    }
  }, [handleTitleSave, reportTitle])

  // Memoize title blur handler
  const handleTitleBlur = useCallback(() => {
    void handleTitleSave()
  }, [handleTitleSave])

  // Memoize risk items to prevent unnecessary re-renders
  const riskItems = useMemo(() => 
    report?.risks?.slice(0, 3).map((r, i) => {
      const sev = detectRiskSeverity(r.risk)
      const color = sev === 'high' ? 'border-red-400/40 bg-red-500/10' : sev === 'low' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'
      
      return (
        <div key={i} className={`p-3 rounded-lg border ${color} hover:opacity-90 transition-opacity`}>
          <div className="flex items-start justify-between mb-2">
            <PriorityBadge level={sev} />
          </div>
          <div className="font-medium text-white/90 text-sm mb-2">{r.risk}</div>
          <div className="text-xs text-white/70 leading-relaxed">
            <span className="font-medium text-white/80">Mitigation:</span> {r.mitigation}
          </div>
        </div>
      )
    }) || [], [report?.risks])

  // Memoize timeline items to prevent unnecessary re-renders
  const timelineItems = useMemo(() => 
    report?.delivery_plan?.timeline?.map((t, i) => {
      const startDate = new Date(t.start)
      const endDate = new Date(t.end)
      const isValid = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())
      const duration = isValid ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0
      
      return (
        <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <span className="font-medium text-white/90 text-sm">{t.label}</span>
            {duration > 0 && (
              <span className="text-xs text-amber-400 font-medium">{duration}w</span>
            )}
          </div>
          <div className="text-xs text-white/60">
            <span>{isValid ? startDate.toLocaleDateString() : t.start}</span>
            <span className="mx-1">→</span>
            <span>{isValid ? endDate.toLocaleDateString() : t.end}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: '100%' }} />
          </div>
        </div>
      )
    }) || [], [report?.delivery_plan?.timeline])

  // Memoize solution items to prevent unnecessary re-renders
  const solutionItems = useMemo(() => 
    report?.solution?.modalities?.map((s: { name: string; reason: string }, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">{s.name}</div>
        <div className="text-xs text-white/70 leading-relaxed">{s.reason}</div>
      </div>
    )) || [], [report?.solution?.modalities])

  // Memoize delivery plan items to prevent unnecessary re-renders
  const deliveryPlanItems = useMemo(() => 
    report?.delivery_plan?.phases?.map((s: { name: string; duration_weeks: number; goals: string[]; activities: string[] }, i: number) => (
      <div key={i} className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-500/20 flex items-center justify-center text-xs font-bold text-secondary-400">
          {i + 1}
        </div>
        <div className="flex-1">
          <div className="font-medium text-white/90 text-sm mb-1">{s.name}</div>
          <div className="text-xs text-white/70 leading-relaxed">
            <div className="mb-2">
              <span className="font-medium text-white/80">Duration:</span> {s.duration_weeks} weeks
            </div>
            <div className="mb-2">
              <span className="font-medium text-white/80">Goals:</span> {s.goals.join(', ')}
            </div>
            <div>
              <span className="font-medium text-white/80">Activities:</span> {s.activities.join(', ')}
            </div>
          </div>
        </div>
      </div>
    )) || [], [report?.delivery_plan?.phases])

  // Memoize metrics items to prevent unnecessary re-renders
  const metricsItems = useMemo(() => 
    report?.measurement?.success_metrics?.map((m: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-white/90 text-sm">Metric {i + 1}</span>
        </div>
        <div className="text-xs text-white/70 leading-relaxed">{m}</div>
      </div>
    )) || [], [report?.measurement?.success_metrics])

  // Memoize audience items to prevent unnecessary re-renders
  const audienceItems = useMemo(() => 
    report?.solution?.scope?.audiences?.map((a: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">Audience {i + 1}</div>
        <div className="text-xs text-white/70 leading-relaxed">{a}</div>
      </div>
    )) || [], [report?.solution?.scope?.audiences])

  // Memoize modality items to prevent unnecessary re-renders
  const modalityItems = useMemo(() => 
    report?.solution?.modalities?.map((m: { name: string; reason: string }, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">{m.name}</div>
        <div className="text-xs text-white/70 leading-relaxed">{m.reason}</div>
      </div>
    )) || [], [report?.solution?.modalities])

  // Memoize technology items to prevent unnecessary re-renders
  const technologyItems = useMemo(() => 
    report?.technology_talent?.tech_enablers?.available?.map((t: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">Technology {i + 1}</div>
        <div className="text-xs text-white/70 leading-relaxed">{t}</div>
      </div>
    )) || [], [report?.technology_talent?.tech_enablers?.available])

  // Memoize assessment items to prevent unnecessary re-renders
  const assessmentItems = useMemo(() => 
    report?.measurement?.assessment_strategy?.map((a: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">Assessment {i + 1}</div>
        <div className="text-xs text-white/70 leading-relaxed">{a}</div>
      </div>
    )) || [], [report?.measurement?.assessment_strategy])

  // Memoize title section to prevent unnecessary re-renders
  const titleSection = useMemo(() => (
    <div className="mb-6">
      {editableTitle ? (
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              className="flex-1 text-2xl font-bold text-white/90 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/80"
              autoFocus
            />
          ) : (
            <h1 className="text-2xl font-bold text-white/90">{titleInput}</h1>
          )}
          {!isEditingTitle && (
            <button
              onClick={handleTitleEdit}
              className="p-2 text-white/60 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
              title="Edit title"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {isEditingTitle && (
            <button
              onClick={handleTitleSave}
              disabled={savingTitle}
              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
              title="Save title"
            >
              {savingTitle ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeOpacity="0.75" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              )}
            </button>
          )}
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-white/90">{titleInput}</h1>
      )}
      <div className="text-sm text-white/60 mt-2">
        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
      </div>
    </div>
  ), [editableTitle, isEditingTitle, titleInput, savingTitle, handleTitleChange, handleTitleKeyDown, handleTitleBlur, handleTitleEdit, handleTitleSave])

  // Early return if no report
  if (!report) {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${className}`}>
        <div className="text-center text-white/60">
          <p>No report data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      {titleSection}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive Summary */}
          {report.summary && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-primary-500/20">
                  <Icon name="summary" className="w-4 h-4 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Executive Summary</h3>
              </div>
              <div className="text-sm text-white/80 leading-relaxed space-y-4">
                {report.summary.problem_statement && (
                  <div>
                    <span className="font-medium text-white/80">Problem Statement:</span>{' '}
                    {report.summary.problem_statement}
                  </div>
                )}

                {report.summary.current_state && report.summary.current_state.length > 0 && (
                  <div>
                    <div className="font-medium text-white/80 mb-1">Current State:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {report.summary.current_state.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.summary.root_causes && report.summary.root_causes.length > 0 && (
                  <div>
                    <div className="font-medium text-white/80 mb-1">Root Causes:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {report.summary.root_causes.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.summary.objectives && report.summary.objectives.length > 0 && (
                  <div>
                    <div className="font-medium text-white/80 mb-1">Objectives:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {report.summary.objectives.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solutions */}
          {report.solution?.modalities && report.solution.modalities.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-secondary-500/20">
                  <Icon name="solution" className="w-4 h-4 text-secondary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Recommended Solutions</h3>
              </div>
              <div className="space-y-3">
                {solutionItems}
              </div>
            </div>
          )}

          {/* Delivery Plan */}
          {report.delivery_plan && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-emerald-500/20">
                  <Icon name="delivery" className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Delivery Plan</h3>
              </div>
              <div className="space-y-4">
                {deliveryPlanItems}
              </div>
            </div>
          )}

          {/* Success Metrics */}
          {report.measurement?.success_metrics && report.measurement.success_metrics.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-blue-500/20">
                  <Icon name="metrics" className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Success Metrics</h3>
              </div>
              <div className="space-y-3">
                {metricsItems}
              </div>
            </div>
          )}

          {/* Project Timeline */}
          {report.delivery_plan?.timeline && report.delivery_plan.timeline.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="timeline" className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-white/90">Project Timeline</h4>
              </div>
              <div className="space-y-3">
                {timelineItems}
              </div>
            </div>
          )}
          
          {/* Enhanced Risk Assessment */}
          {report.risks && report.risks.length > 0 && (
            <div className="glass-card p-5 border-l-4 border-l-red-400">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-red-500/20">
                  <Icon name="risks" className="w-4 h-4 text-red-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Risk Assessment</h4>
              </div>
              <div className="space-y-3">
                {riskItems}
                {report.risks.length > 3 && (
                  <div className="text-center">
                    <button className="text-xs text-red-400 hover:text-red-300 underline">
                      View all {report.risks.length} risk factors
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Quick Actions removed from main column; moved to bottom toolbar */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Audience */}
          {report.solution?.scope?.audiences && report.solution.scope.audiences.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-purple-500/20">
                  <Icon name="audience" className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Target Audience</h4>
              </div>
              <div className="space-y-3">
                {audienceItems}
              </div>
            </div>
          )}

          {/* Learning Modalities */}
          {report.solution?.modalities && report.solution.modalities.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-indigo-500/20">
                  <Icon name="modality" className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Learning Modalities</h4>
              </div>
              <div className="space-y-3">
                {modalityItems}
              </div>
            </div>
          )}

          {/* Technology Stack */}
          {report.technology_talent?.tech_enablers?.available && report.technology_talent.tech_enablers.available.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-cyan-500/20">
                  <Icon name="tech" className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Technology Stack</h4>
              </div>
              <div className="space-y-3">
                {technologyItems}
              </div>
            </div>
          )}

          {/* Assessment Strategy */}
          {report.measurement?.assessment_strategy && report.measurement.assessment_strategy.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-orange-500/20">
                  <Icon name="assessment" className="w-4 h-4 text-orange-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Assessment Strategy</h4>
              </div>
              <div className="space-y-3">
                {assessmentItems}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Bottom Action Toolbar (UI-only) */}
      <div className="sticky bottom-0 mt-6 z-10">
        <div className="backdrop-blur supports-[backdrop-filter]:bg-primary-500/20 bg-primary-500/15 border border-primary-600/30 rounded-xl p-3 flex items-center justify-center shadow-lg shadow-primary-600/10">
          <div className="flex items-center gap-2">
            <button
              className="h-9 w-9 rounded-lg bg-secondary-500/20 hover:bg-secondary-500/30 text-secondary-200 border border-secondary-400/30 flex items-center justify-center transition-colors"
              aria-label="Export report"
              title="Export report"
            >
              <Icon name="doc" className="w-4 h-4" />
            </button>
            <button
              className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center justify-center transition-colors"
              aria-label="Share insights"
              title="Share insights"
            >
              <Icon name="check" className="w-4 h-4" />
            </button>
            <button
              className="h-9 w-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center justify-center transition-colors"
              aria-label="Create action plan"
              title="Create action plan"
            >
              <Icon name="steps" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ReportDisplay.displayName = 'ReportDisplay'

export default ReportDisplay
