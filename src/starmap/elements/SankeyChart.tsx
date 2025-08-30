import { useEffect, useMemo, useState } from 'react'

type SankeyLink = { source: string | number; target: string | number; value: number }

export default function SankeyChart({ spec }: { spec: any }) {
  const [RC, setRC] = useState<any | null>(null)
  useEffect(() => { let mounted = true; import('recharts').then(mod => { if (mounted) setRC(mod) }); return () => { mounted = false } }, [])

  const { nodes, links } = useMemo(() => {
    const nodesRaw: string[] = Array.isArray(spec?.data?.nodes) ? spec.data.nodes : []
    const linksRaw: SankeyLink[] = Array.isArray(spec?.data?.links) ? spec.data.links : []

    // Build node index map from provided node list or from link endpoints
    const names = new Set<string>()
    nodesRaw.forEach((n) => names.add(String(n)))
    linksRaw.forEach((l) => { if (typeof l.source === 'string') names.add(l.source); if (typeof l.target === 'string') names.add(l.target) })
    const nameArr = Array.from(names)
    const nameToIndex = new Map(nameArr.map((n, i) => [n, i]))

    const nodes = nameArr.map((name) => ({ name }))
    const links = linksRaw.map((l) => ({
      source: typeof l.source === 'number' ? l.source : (nameToIndex.get(String(l.source)) ?? 0),
      target: typeof l.target === 'number' ? l.target : (nameToIndex.get(String(l.target)) ?? 0),
      value: Number((l as any).value) || 0,
    }))

    return { nodes, links }
  }, [spec])

  const a11yLabel = spec?.a11y?.ariaLabel || spec?.title || 'Sankey diagram'

  if (!RC) return <div className="h-72 glass-card" aria-busy="true" />
  const SankeyComp = (RC as any).Sankey

  if (!SankeyComp) {
    // Fallback to a simple table if Sankey is not available
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {spec?.title && <div className="text-sm font-medium mb-2">{spec.title}</div>}
        <div className="text-xs text-white/60 mb-2">Sankey not available in chart library. Showing flows as table.</div>
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-white/80">Source</th>
              <th className="text-left px-3 py-2 font-medium text-white/80">Target</th>
              <th className="text-left px-3 py-2 font-medium text-white/80">Value</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i} className="odd:bg-white/[0.02]">
                <td className="px-3 py-2 text-white/80">{nodes[l.source]?.name ?? String(l.source)}</td>
                <td className="px-3 py-2 text-white/80">{nodes[l.target]?.name ?? String(l.target)}</td>
                <td className="px-3 py-2 text-white/80">{l.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const { ResponsiveContainer } = RC
  return (
    <div className="glass-card p-4" role="figure" aria-label={a11yLabel}>
      {spec?.title && <div className="text-sm font-medium mb-2">{spec.title}</div>}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <SankeyComp data={{ nodes, links }} nodePadding={24} nodeWidth={12} link={{ stroke: '#60a5fa' }} node={{ fill: '#22d3ee' }} />
        </ResponsiveContainer>
      </div>
    </div>
  )
}


