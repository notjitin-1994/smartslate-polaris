import { useEffect, useMemo, useRef, useState } from 'react'
import type { PolarisSummary } from '@/services/polarisSummaryService'
import { extractInThisReportInfo } from '@/polaris/needs-analysis/parse'

interface StarmapCardProps {
  summary: PolarisSummary
  onOpen?: (id: string) => void
  onDelete?: (id: string) => void
  deleting?: boolean
}

function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState<number>(0)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width || el.clientWidth
      setWidth(w)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  return { ref, width }
}

export default function StarmapCard({ summary, onOpen, onDelete, deleting }: StarmapCardProps) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()

  const info = useMemo(() => extractInThisReportInfo(summary.summary_content), [summary.summary_content])
  const createdAt = useMemo(() => new Date(summary.created_at).toLocaleString(), [summary.created_at])

  // Content tiers
  // tier 3: >= 900px (rich details)
  // tier 2: >= 520px (compact key info)
  // tier 1: < 520px (minimal)
  const tier = width >= 900 ? 3 : width >= 520 ? 2 : 1

  return (
    <div ref={ref} className="glass-card p-4 transition-all hover:bg-white/10">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen?.(summary.id)}
          className="text-left flex-1 min-w-0"
        >
          <h3 className="font-semibold text-white/90 truncate">
            {summary.report_title || summary.company_name || 'Untitled Discovery'}
          </h3>
          <p className="text-xs text-white/60 mt-1">{createdAt}</p>

          {tier === 1 && (
            <p className="text-xs text-white/70 mt-2">Click to view Starmap</p>
          )}

          {tier === 2 && info && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="glass-card p-2">
                <div className="text-[11px] text-white/60">Sections</div>
                <div className="text-sm font-semibold text-white/90 truncate">{info.sections.slice(0, 3).join(', ')}{info.sections.length > 3 ? '…' : ''}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[11px] text-white/60">Highlights</div>
                <div className="text-sm font-semibold text-white/90">
                  {info.counts.modalities} mods · {info.counts.phases} phases · {info.counts.metrics} metrics
                </div>
              </div>
            </div>
          )}

          {tier === 3 && info && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="glass-card p-3">
                <div className="text-xs font-semibold text-white/80 mb-1">In this report</div>
                <ul className="text-xs text-white/70 space-y-1">
                  {info.sections.slice(0, 6).map((s, i) => (
                    <li key={i} className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-primary-300" />{s}</li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-3">
                <div className="text-xs font-semibold text-white/80 mb-1">Key counts</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/75">
                  <div><span className="text-white/60">Modalities:</span> <span className="font-semibold text-white/90">{info.counts.modalities}</span></div>
                  <div><span className="text-white/60">Objectives:</span> <span className="font-semibold text-white/90">{info.counts.objectives}</span></div>
                  <div><span className="text-white/60">Phases:</span> <span className="font-semibold text-white/90">{info.counts.phases}</span></div>
                  <div><span className="text-white/60">Metrics:</span> <span className="font-semibold text-white/90">{info.counts.metrics}</span></div>
                </div>
              </div>
              <div className="glass-card p-3">
                <div className="text-xs font-semibold text-white/80 mb-1">Problem statement</div>
                <p className="text-xs text-white/70 line-clamp-5">{info.problemStatement || '—'}</p>
              </div>
            </div>
          )}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(summary.id)}
            disabled={deleting}
            className="p-1 text-white/40 hover:text-red-400 transition-colors"
            title="Delete starmap"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}


