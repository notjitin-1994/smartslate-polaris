export default function Timeline({ spec }: { spec: any }) {
  const baseItems: Array<{ date?: string; title: string; description?: string }> = Array.isArray(spec?.data?.items)
    ? spec.data.items
    : Array.isArray(spec?.data?.phases)
      ? (spec.data.phases as any[]).map((p: any) => ({ date: p.end || p.start, title: p.name || p.milestone || '', description: p.milestone || '' }))
      : []
  const items = baseItems
  if (!items.length) return <div className="text-sm opacity-70">No timeline data.</div>
  return (
    <ol className="relative border-l border-white/20 ml-3 glass-card p-4">
      {items.map((it, idx) => (
        <li key={idx} className="mb-6 ml-6">
          <span className="absolute -left-1.5 mt-1 flex h-3 w-3 rounded-full border border-white/40 bg-white/20" />
          <h3 className="font-medium">{it.title}</h3>
          {it.date && <time className="text-xs text-white/60">{new Date(it.date).toLocaleDateString()}</time>}
          {it.description && <p className="text-sm text-white/80 mt-1">{it.description}</p>}
        </li>
      ))}
    </ol>
  )
}


