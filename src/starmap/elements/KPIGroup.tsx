import { clsx } from 'clsx'

export default function KPIGroup({ spec }: { spec: any }) {
  const items: Array<{ id?: string; label: string; value: string | number; delta?: number; semantic?: 'info'|'success'|'warning'|'danger' }> =
    Array.isArray(spec?.data?.items) ? spec.data.items : []

  if (!items.length) return <div className="text-sm opacity-70">No KPIs available.</div>

  const colorFor = (semantic?: string) =>
    semantic === 'success' ? 'text-emerald-400' : semantic === 'warning' ? 'text-amber-400' : semantic === 'danger' ? 'text-rose-400' : 'text-sky-400'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((kpi, idx) => (
        <div key={kpi.id || idx} className="glass-card p-4" aria-label={spec?.a11y?.ariaLabel || kpi.label}>
          <div className="text-xs uppercase tracking-wide text-white/60">{kpi.label}</div>
          <div className={clsx('mt-1 text-2xl font-semibold', colorFor(kpi.semantic))}>{kpi.value}</div>
          {typeof kpi.delta === 'number' && (
            <div className={clsx('mt-1 text-xs', kpi.delta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {kpi.delta >= 0 ? '+' : ''}{kpi.delta}% vs last period
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


