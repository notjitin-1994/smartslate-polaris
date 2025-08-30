import { useEffect, useMemo, useState } from 'react'

export default function DonutChart({ spec }: { spec: any }) {
  const [RC, setRC] = useState<any | null>(null)
  useEffect(() => { let mounted = true; import('recharts').then(mod => { if (mounted) setRC(mod) }); return () => { mounted = false } }, [])
  const toNumber = (v: any): number => {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return Number(v) || 0
    const lower = v.trim().toLowerCase()
    const mult = lower.endsWith('k') ? 1000 : lower.endsWith('m') ? 1000000 : 1
    const cleaned = lower.replace(/[,\s%km]/g, '')
    const n = parseFloat(cleaned)
    return (isNaN(n) ? 0 : n) * mult
  }
  const data = useMemo(() => {
    const d = spec?.data
    if (!d) return []
    if (Array.isArray(d.series)) return d.series.map((s: any) => ({ name: s.name ?? s.label, value: toNumber(s.value) }))
    if (Array.isArray(d.slices)) return d.slices.map((s: any) => ({ name: s.label ?? s.name, value: toNumber(s.value) }))
    if (Array.isArray(d.items)) return d.items.map((s: any) => ({ name: s.name ?? s.label, value: toNumber(s.value ?? s.count ?? s.percentage) }))
    if (Array.isArray(d.values) && Array.isArray(d.labels)) return d.labels.map((name: any, i: number) => ({ name: String(name), value: toNumber(d.values[i]) }))
    return []
  }, [spec])
  const colors: string[] = spec?.data?.colors || ['#22d3ee', '#34d399', '#f59e0b', '#60a5fa', '#f472b6']
  const a11yLabel = spec?.a11y?.ariaLabel || spec?.title || 'Donut chart'
  if (!RC) return <div className="h-64 rounded-xl border border-white/10 bg-white/5" aria-busy="true" />
  const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = RC
  return (
    <div className="glass-card p-4" role="figure" aria-label={a11yLabel}>
      {spec?.title && <div className="text-sm font-medium mb-2">{spec.title}</div>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
              {data.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


