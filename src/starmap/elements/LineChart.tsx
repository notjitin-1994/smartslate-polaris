import { useEffect, useMemo, useState } from 'react'

type SeriesPoint = { name: string | number; value: number }

export default function LineChart({ spec }: { spec: any }) {
  const [RC, setRC] = useState<any | null>(null)
  useEffect(() => { let mounted = true; import('recharts').then(mod => { if (mounted) setRC(mod) }); return () => { mounted = false } }, [])

  const series: SeriesPoint[] = useMemo(() => {
    const toNumber = (v: any): number => {
      if (typeof v === 'number') return v
      if (typeof v !== 'string') return Number(v) || 0
      const lower = v.trim().toLowerCase()
      const mult = lower.endsWith('k') ? 1000 : lower.endsWith('m') ? 1000000 : 1
      const cleaned = lower.replace(/[,\s%km]/g, '')
      const n = parseFloat(cleaned)
      return (isNaN(n) ? 0 : n) * mult
    }
    const d = spec?.data
    if (!d) return []
    if (Array.isArray(d.series)) return d.series.map((s: any) => ({ name: s.name ?? s.label, value: toNumber(s.value) }))
    if (Array.isArray(d.items)) return d.items.map((it: any) => ({ name: it.name ?? it.label ?? '', value: toNumber(it.value ?? it.count ?? 0) }))
    if (Array.isArray(d.x) && Array.isArray(d.y)) return (d.x as any[]).map((name: any, i: number) => ({ name, value: toNumber((d.y as any[])[i]) }))
    if (Array.isArray(d.labels) && Array.isArray(d.values)) return (d.labels as any[]).map((name: any, i: number) => ({ name, value: toNumber((d.values as any[])[i]) }))
    return []
  }, [spec])

  const a11yLabel = spec?.a11y?.ariaLabel || spec?.title || 'Line chart'
  if (!RC) return <div className="h-64 rounded-xl border border-white/10 bg-white/5" aria-busy="true" />
  const { ResponsiveContainer, LineChart: RCLine, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } = RC

  return (
    <div className="glass-card p-4" role="figure" aria-label={a11yLabel}>
      {spec?.title && <div className="text-sm font-medium mb-2">{spec.title}</div>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RCLine data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.8)' }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.8)' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #2f3640', color: '#fff' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#a7dadb" strokeWidth={2} dot={false} />
          </RCLine>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


