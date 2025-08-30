import React from 'react'

type Measure = {
  kpi?: string
  name?: string
  unit?: string
  current?: number
  target?: number
}

export default function BulletChart({ spec }: { spec: any }) {
  const measures: Measure[] = Array.isArray(spec?.data?.measures)
    ? spec.data.measures
    : Array.isArray(spec?.data?.items)
      ? spec.data.items
      : []

  if (!measures.length) return <div className="text-sm opacity-70">No KPI measures.</div>

  const barColor = '#60a5fa'
  const targetColor = '#a7dadb'

  return (
    <div className="glass-card p-4">
      {spec?.title && <div className="text-sm font-medium mb-3">{spec.title}</div>}
      <div className="space-y-4">
        {measures.map((m, i) => {
          const label = m.kpi || m.name || `KPI ${i + 1}`
          const unit = m.unit || ''
          const target = Number(m.target) || 0
          const current = Math.max(0, Number(m.current) || 0)
          const maxValue = Math.max(target, current, 1)
          const pct = Math.min(100, (current / maxValue) * 100)
          const targetPct = Math.min(100, (target / maxValue) * 100)
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="text-white/70">{label}</div>
                <div className="text-white/60">
                  {current}{unit ? ` ${unit}` : ''} / {target}{unit ? ` ${unit}` : ''}
                </div>
              </div>
              <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="absolute inset-y-0 left-0 bar-smooth" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                <div className="absolute inset-y-0" style={{ left: `${targetPct}%` }}>
                  <div className="w-[2px] h-full" style={{ backgroundColor: targetColor }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



