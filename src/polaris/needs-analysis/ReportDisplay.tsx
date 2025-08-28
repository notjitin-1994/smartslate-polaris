// src/polaris/needs-analysis/ReportDisplay.tsx
// Enhanced UX version with improved readability, scanability, and actionability
import { useState, useCallback, useMemo, memo } from 'react'
import type { ReactNode } from 'react'
import { parseMarkdownToReport } from './parse'
import { convertNaJsonStringToMarkdown } from './format'
import { generateShareLink, copyToClipboard, shareLinkNative } from '@/utils/shareUtils'
import { getReportPublicStatus, toggleReportPublicStatus } from '@/services/polarisSummaryService'

interface ReportDisplayProps {
  reportMarkdown: string
  reportTitle?: string
  editableTitle?: boolean
  savingTitle?: boolean
  onSaveTitle?: (newTitle: string) => void | Promise<void>
  className?: string
  hideTitleSection?: boolean
  summaryId?: string // Optional summary ID for share functionality
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

// Icon types
type IconName = 'summary' | 'solution' | 'delivery' | 'metrics' | 'timeline' | 'steps' | 'risks' | 'audience' | 'modality' | 'tech' | 'doc' | 'blend' | 'online' | 'workshop' | 'coach' | 'toolbox' | 'check' | 'database' | 'assessment' | 'target'

// Memoized Icon component for better performance
const Icon = memo(({ name, className = 'w-4 h-4' }: { 
  name: IconName
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
const ReportDisplay = memo(({ reportMarkdown, reportTitle, editableTitle = false, savingTitle = false, onSaveTitle, className = '', hideTitleSection = false, summaryId }: ReportDisplayProps) => {
  // Share functionality states
  const [isPublic] = useState(false)
  const [shareLoading] = useState(false)
  const [showShareSuccess] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)

  // Load public status if summaryId is provided
  // Public/private status is no longer toggled via the UI; share only copies link

  const ensurePublic = useCallback(async () => {
    if (!summaryId) return
    const { isPublic } = await getReportPublicStatus(summaryId)
    if (!isPublic) {
      await toggleReportPublicStatus(summaryId)
    }
  }, [summaryId])

  const handleShare = useCallback(async () => {
    if (!summaryId) return
    await ensurePublic()
    const shareLink = generateShareLink(summaryId)
    // titleInput is declared later; capture current computed title directly
    const fallbackTitle = reportTitle || 'Needs Analysis Report'
    const outcome = await shareLinkNative({ url: shareLink, title: fallbackTitle })
    if (outcome === 'copied') {
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 2000)
    } else if (outcome === 'failed') {
      const copied = await copyToClipboard(shareLink)
      if (copied) {
        setShowCopySuccess(true)
        setTimeout(() => setShowCopySuccess(false), 2000)
      }
    }
  }, [summaryId, ensurePublic, reportTitle])

  // --- Lightweight markdown helpers for non-structured reports (greeting/org/requirement) ---
  type Section = { title: string; lines: string[] }

  const parseSections = useCallback((markdown: string): Section[] => {
    const lines = markdown.split('\n')
    const sections: Section[] = []
    let current: Section | null = null

    for (const raw of lines) {
      const line = raw.replace(/\r$/, '')
      if (/^##\s+/.test(line)) {
        if (current) sections.push(current)
        current = { title: line.replace(/^##\s+/, '').trim(), lines: [] }
      } else if (current) {
        current.lines.push(line)
      }
    }
    if (current) sections.push(current)
    return sections.filter(s => s.title || s.lines.some(l => l.trim() !== ''))
  }, [])

  const renderInline = useCallback((text: string) => {
    // Bold: **text**
    const parts = text.split('**')
    return parts.map((part, idx) => (
      idx % 2 === 1 ? <strong key={idx} className="text-white/90">{part}</strong> : <span key={idx}>{part}</span>
    ))
  }, [])

  const renderLines = useCallback((lines: string[]) => {
    const nodes: ReactNode[] = []
    let listBuffer: string[] = []

    const flushList = () => {
      if (listBuffer.length > 0) {
        nodes.push(
          <ul key={`ul-${nodes.length}`} className="list-disc pl-5 space-y-1 text-sm text-white/80">
            {listBuffer.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        )
        listBuffer = []
      }
    }

    for (const raw of lines) {
      const line = raw.trimEnd()
      if (line.startsWith('- ')) {
        listBuffer.push(line.substring(2))
        continue
      }
      if (/^\*\*.+\*\*$/.test(line)) {
        flushList()
        nodes.push(
          <h4 key={`h4-${nodes.length}`} className="text-sm font-semibold text-white/90 mt-4 mb-2">
            {renderInline(line.replace(/^\*\*(.+)\*\*$/, '$1'))}
          </h4>
        )
        continue
      }
      if (line.trim() === '') {
        flushList()
        nodes.push(<div key={`sp-${nodes.length}`} className="h-1" />)
        continue
      }
      flushList()
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-sm text-white/80 leading-relaxed">{renderInline(line)}</p>
      )
    }
    flushList()
    return nodes
  }, [renderInline])

  const getIconForSection = useCallback((title: string): IconName => {
    const t = title.toLowerCase()
    if (t.includes('snapshot')) return 'summary'
    if (t.includes('challenge')) return 'risks'
    if (t.includes('best practice')) return 'solution'
    if (t.includes('trend')) return 'metrics'
    if (t.includes('question')) return 'assessment'
    if (t.includes('profile')) return 'doc'
    if (t.includes('gap') || t.includes('next step')) return 'steps'
    return 'doc'
  }, [])

  // Convert NA JSON content to markdown if needed, then parse
  const normalizedMarkdown = useMemo(() => convertNaJsonStringToMarkdown(reportMarkdown) || reportMarkdown, [reportMarkdown])
  const report = useMemo(() => parseMarkdownToReport(normalizedMarkdown), [normalizedMarkdown])
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [titleInput, setTitleInput] = useState<string>(reportTitle || 'Needs Analysis Report')
  const [showAllRisks, setShowAllRisks] = useState<boolean>(false)
  
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
    (showAllRisks ? (report?.risks || []) : (report?.risks || []).slice(0, 3)).map((r, i) => {
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
    }) || [], [report?.risks, showAllRisks])

  // Memoize timeline items to prevent unnecessary re-renders
  const timelineItems = useMemo(() => 
    report?.delivery_plan?.timeline?.map((t, i) => {
      const startDate = t.start ? new Date(t.start) : null
      const endDate = t.end ? new Date(t.end) : null
      const isValid = !!(startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()))
      const duration = isValid && startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0
      
      return (
        <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <span className="font-medium text-white/90 text-sm">{t.label}</span>
            {duration > 0 && (
              <span className="text-xs text-amber-400 font-medium">{duration}w</span>
            )}
          </div>
          <div className="text-xs text-white/60">
            <span>{isValid && startDate ? startDate.toLocaleDateString() : (t.start || '')}</span>
            <span className="mx-1">→</span>
            <span>{isValid && endDate ? endDate.toLocaleDateString() : (t.end || '')}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: '100%' }} />
          </div>
        </div>
      )
    }) || [], [report?.delivery_plan?.timeline])

  // Memoize solution items to prevent unnecessary re-renders
  const solutionItems = useMemo(() => 
    report?.solution?.delivery_modalities?.map((s: any, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">{(s?.modality || 'Modality')} {(s?.priority ?? i + 1) ? `(P${s?.priority ?? i + 1})` : ''}</div>
        <div className="text-xs text-white/70 leading-relaxed">{s?.reason || ''}</div>
      </div>
    )) || [], [report?.solution?.delivery_modalities])

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
    report?.measurement?.success_metrics?.map((m: any, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-white/90 text-sm">Metric {i + 1}</span>
        </div>
        {typeof m === 'string' ? (
          <div className="text-xs text-white/70 leading-relaxed">{m}</div>
        ) : (
          <div className="text-xs text-white/70 leading-relaxed">
            <div className="font-medium text-white/80">{m?.metric || ''}</div>
            {(m?.baseline || m?.target || m?.timeframe) && (
              <div>
                {m?.baseline ? `Baseline: ${m.baseline} ` : ''}
                {m?.target ? `Target: ${m.target}` : ''}
                {m?.timeframe ? ` by ${m.timeframe}` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    )) || [], [report?.measurement?.success_metrics])

  // Memoize audience items to prevent unnecessary re-renders
  const audienceItems = useMemo(() => 
    report?.solution?.target_audiences?.map((a: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">Audience {i + 1}</div>
        <div className="text-xs text-white/70 leading-relaxed">{a}</div>
      </div>
    )) || [], [report?.solution?.target_audiences])

  // Memoize modality items to prevent unnecessary re-renders (not used directly; kept for future use)
  // const modalityItems = useMemo(() => 
  //   report?.solution?.delivery_modalities?.map((m: any, i: number) => (
  //     <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
  //       <div className="font-medium text-white/90 text-sm mb-2">{(m?.modality || 'Modality')} {(m?.priority ?? i + 1) ? `(P${m?.priority ?? i + 1})` : ''}</div>
  //       <div className="text-xs text-white/70 leading-relaxed">{m?.reason || ''}</div>
  //     </div>
  //   )) || [], [report?.solution?.delivery_modalities])

  // Memoize technology items to prevent unnecessary re-renders
  const technologyItems = useMemo(() => 
    report?.technology_talent?.technology?.current_stack?.map((t: string, i: number) => (
      <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        <div className="font-medium text-white/90 text-sm mb-2">Technology {i + 1}</div>
        <div className="text-xs text-white/70 leading-relaxed">{t}</div>
      </div>
    )) || [], [report?.technology_talent?.technology?.current_stack])

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white/90">{titleInput}</h1>
          {/* Share Button */}
          {summaryId && (
            <div className="relative">
              <button
                onClick={handleShare}
                className={`p-2 rounded-full transition-all hover:bg-white/10 text-white/60 hover:text-white touch-manipulation`}
                title="Copy link"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4" />
                  <path d="M8 8l4-4 4 4" />
                  <path d="M20 20H4a2 2 0 0 1-2-2v-3" />
                </svg>
              </button>
              {showCopySuccess && (
                <div className="absolute top-full mt-2 right-0 bg-primary-400/20 border border-primary-400/30 rounded-lg p-3 text-sm text-primary-400 whitespace-nowrap animate-in fade-in slide-in-from-top-1 z-50">
                  Share link copied to clipboard!
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="text-sm text-white/60 mt-2">
        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
      </div>
    </div>
  ), [editableTitle, isEditingTitle, titleInput, savingTitle, handleTitleChange, handleTitleKeyDown, handleTitleBlur, handleTitleEdit, handleTitleSave, summaryId, handleShare, shareLoading, isPublic, showShareSuccess, showCopySuccess])

  // Decide if parsed report has any structured content; if not, we will render a plain markdown fallback
  const hasStructuredContent = useMemo(() => {
    if (!report) return false
    const hasSummary = !!(report.summary?.problem_statement) 
      || (report.summary?.current_state?.length || 0) > 0
      || (report.summary?.root_causes?.length || 0) > 0
      || (report.summary?.objectives?.length || 0) > 0
    const hasSolution = (report.solution?.delivery_modalities?.length || 0) > 0
      || (report.solution?.target_audiences?.length || 0) > 0
      || (report.solution?.key_competencies?.length || 0) > 0
      || (report.solution?.content_outline?.length || 0) > 0
    const hasDelivery = (report.delivery_plan?.phases?.length || 0) > 0
      || (report.delivery_plan?.timeline?.length || 0) > 0
      || (report.delivery_plan?.resources?.length || 0) > 0
    const hasMeasurement = (report.measurement?.success_metrics?.length || 0) > 0
      || (report.measurement?.assessment_strategy?.length || 0) > 0
      || (report.measurement?.data_sources?.length || 0) > 0
      || (report.measurement?.learning_analytics?.levels?.length || 0) > 0
      || !!report.measurement?.learning_analytics?.reporting_cadence
    const hasBudget = (report.budget?.items?.length || 0) > 0 || !!report.budget?.notes
    const hasRisks = (report.risks?.length || 0) > 0
    const hasNext = (report.next_steps?.length || 0) > 0
    return hasSummary || hasSolution || hasDelivery || hasMeasurement || hasBudget || hasRisks || hasNext
  }, [report])

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

  // Fallback view for raw markdown reports (e.g., Greeting/Org/Requirement reports) not matching the structured parser
  if (!hasStructuredContent) {
    const sections = parseSections(reportMarkdown)
    return (
      <div className={`max-w-6xl mx-auto p-6 ${className}`}>
        {!hideTitleSection && titleSection}
        <div className="space-y-6">
          {sections.map((s, idx) => (
            <div key={idx} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded bg-white/10">
                  <Icon name={getIconForSection(s.title)} className="w-4 h-4 text-white/70" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">{s.title}</h3>
              </div>
              <div className="space-y-2">
                {renderLines(s.lines)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      {!hideTitleSection && titleSection}
      
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
          {report.solution?.delivery_modalities && report.solution.delivery_modalities.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-secondary-500/20">
                  <Icon name="solution" className="w-4 h-4 text-secondary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Business Objectives & Requirements</h3>
              </div>
              <div className="space-y-3">
                {solutionItems}
              </div>
            </div>
          )}

          {/* Key Competencies */}
          {report.solution?.key_competencies && report.solution.key_competencies.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-purple-500/20">
                  <Icon name="toolbox" className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Key Competencies</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                {report.solution.key_competencies.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Content Outline */}
          {report.solution?.content_outline && report.solution.content_outline.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-indigo-500/20">
                  <Icon name="doc" className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Proposed Curriculum Structure</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                {report.solution.content_outline.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Learner Analysis */}
          {report.learner_analysis?.profiles && report.learner_analysis.profiles.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-primary-500/20">
                  <Icon name="audience" className="w-4 h-4 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Learner Analysis</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.learner_analysis.profiles.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                    <div className="font-medium text-white/90 text-sm mb-1">{p.segment}</div>
                    <div className="text-xs text-white/70 leading-relaxed">
                      {p.roles?.length ? (<div><span className="font-medium text-white/80">Roles:</span> {p.roles.join(', ')}</div>) : null}
                      {p.context ? (<div className="mt-1"><span className="font-medium text-white/80">Context:</span> {p.context}</div>) : null}
                      {p.motivators?.length ? (<div className="mt-1"><span className="font-medium text-white/80">Motivators:</span> {p.motivators.join(', ')}</div>) : null}
                      {p.constraints?.length ? (<div className="mt-1"><span className="font-medium text-white/80">Constraints:</span> {p.constraints.join(', ')}</div>) : null}
                    </div>
                  </div>
                ))}
              </div>
              {report.learner_analysis.readiness_risks?.length ? (
                <div className="mt-4">
                  <div className="font-medium text-white/80 mb-1">Readiness Risks</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.learner_analysis.readiness_risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
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

          {/* Measurement Details */}
          {(report.measurement?.data_sources?.length || report.measurement?.learning_analytics?.levels?.length || report.measurement?.learning_analytics?.reporting_cadence) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-orange-500/20">
                  <Icon name="assessment" className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Measurement Details</h3>
              </div>
              {report.measurement?.data_sources?.length ? (
                <div className="mb-3">
                  <div className="font-medium text-white/80 mb-1">Data Sources</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.measurement.data_sources.map((d, i) => (<li key={i}>{d}</li>))}
                  </ul>
                </div>
              ) : null}
              {(report.measurement?.learning_analytics?.levels?.length || report.measurement?.learning_analytics?.reporting_cadence) ? (
                <div>
                  <div className="font-medium text-white/80 mb-1">Learning Analytics</div>
                  {report.measurement.learning_analytics.levels?.length ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                      {report.measurement.learning_analytics.levels.map((l, i) => (<li key={i}>{l}</li>))}
                    </ul>
                  ) : null}
                  {report.measurement.learning_analytics.reporting_cadence ? (
                    <div className="text-sm text-white/70 mt-2">Reporting Cadence: {report.measurement.learning_analytics.reporting_cadence}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {/* Budget */}
          {(report.budget && (report.budget.items?.length || report.budget.notes)) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-cyan-500/20">
                  <Icon name="database" className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Budget</h3>
              </div>
              {report.budget.notes ? (
                <div className="text-sm text-white/80 leading-relaxed mb-3">{report.budget.notes}</div>
              ) : null}
              {report.budget.items?.length ? (
                <div className="space-y-2">
                  {report.budget.items.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                      <div className="text-sm text-white/90 font-medium">{b.item}</div>
                      <div className="text-xs text-white/70">{report.budget.currency || 'USD'} {b.low} – {b.high}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Next Steps */}
          {report.next_steps && report.next_steps.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-emerald-500/20">
                  <Icon name="steps" className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Next Steps</h3>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-white/80">
                {report.next_steps.map((s, i) => (<li key={i}>{s}</li>))}
              </ol>
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
                <h4 className="text-sm font-semibold text-white/90">Risks & Change Readiness</h4>
              </div>
              <div className="space-y-3">
                {riskItems}
                {report.risks.length > 3 && (
                  <div className="text-center">
                    <button
                      className="text-xs text-red-400 hover:text-red-300 underline"
                      onClick={() => setShowAllRisks(v => !v)}
                    >
                      {showAllRisks ? 'Hide extra risk factors' : `View all ${report.risks.length} risk factors`}
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
          {report.solution?.target_audiences && report.solution.target_audiences.length > 0 && (
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

          {/* Accessibility & Inclusion */}
          {(report.solution?.accessibility_and_inclusion?.standards?.length || report.solution?.accessibility_and_inclusion?.notes) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-indigo-500/20">
                  <Icon name="check" className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Accessibility & Inclusion</h4>
              </div>
              {report.solution.accessibility_and_inclusion.standards?.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                  {report.solution.accessibility_and_inclusion.standards.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              ) : null}
              {report.solution.accessibility_and_inclusion.notes ? (
                <div className="text-xs text-white/70 leading-relaxed mt-2">{report.solution.accessibility_and_inclusion.notes}</div>
              ) : null}
            </div>
          )}

          {/* Technology Stack */}
          {(report.technology_talent?.technology?.current_stack?.length || report.technology_talent?.technology?.gaps?.length || report.technology_talent?.technology?.recommendations?.length || report.technology_talent?.technology?.data_plan?.standards?.length || report.technology_talent?.technology?.data_plan?.integrations?.length) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-cyan-500/20">
                  <Icon name="tech" className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Technology & Data</h4>
              </div>
              {report.technology_talent.technology.current_stack?.length ? (
                <div className="mb-3">
                  <div className="font-medium text-white/80 mb-1">Current Stack</div>
                  <div className="space-y-3">{technologyItems}</div>
                </div>
              ) : null}
              {report.technology_talent.technology.gaps?.length ? (
                <div className="mb-3">
                  <div className="font-medium text-white/80 mb-1">Gaps</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.technology_talent.technology.gaps.map((g, i) => (<li key={i}>{g}</li>))}
                  </ul>
                </div>
              ) : null}
              {report.technology_talent.technology.recommendations?.length ? (
                <div className="mb-3">
                  <div className="font-medium text-white/80 mb-1">Recommendations</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.technology_talent.technology.recommendations.map((r, i) => (
                      <li key={i}>{r.capability} — {r.fit}{r.constraints?.length ? ` (Constraints: ${r.constraints.join(', ')})` : ''}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(report.technology_talent.technology.data_plan?.standards?.length || report.technology_talent.technology.data_plan?.integrations?.length) ? (
                <div>
                  <div className="font-medium text-white/80 mb-1">Data Plan</div>
                  {report.technology_talent.technology.data_plan.standards?.length ? (
                    <div className="text-xs text-white/70 mb-1">Standards: {report.technology_talent.technology.data_plan.standards.join(', ')}</div>
                  ) : null}
                  {report.technology_talent.technology.data_plan.integrations?.length ? (
                    <div className="text-xs text-white/70">Integrations: {report.technology_talent.technology.data_plan.integrations.join(', ')}</div>
                  ) : null}
                </div>
              ) : null}
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

          {/* Talent Overview */}
          {(report.technology_talent?.talent?.available_roles?.length || report.technology_talent?.talent?.gaps?.length || report.technology_talent?.talent?.recommendations?.length) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-emerald-500/20">
                  <Icon name="coach" className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">Talent Overview</h4>
              </div>
              {report.technology_talent.talent.available_roles?.length ? (
                <div className="mb-2 text-sm text-white/80"><span className="font-medium text-white/80">Available Roles:</span> {report.technology_talent.talent.available_roles.join(', ')}</div>
              ) : null}
              {report.technology_talent.talent.gaps?.length ? (
                <div className="mb-2">
                  <div className="font-medium text-white/80 mb-1">Gaps</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.technology_talent.talent.gaps.map((g, i) => (<li key={i}>{g}</li>))}
                  </ul>
                </div>
              ) : null}
              {report.technology_talent.talent.recommendations?.length ? (
                <div>
                  <div className="font-medium text-white/80 mb-1">Recommendations</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                    {report.technology_talent.talent.recommendations.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ReportDisplay.displayName = 'ReportDisplay'

export default ReportDisplay
