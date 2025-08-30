import React from 'react'

type Milestone = {
  name?: string
  title?: string
  outcome?: string
  duration_min?: number
}

export default function MilestoneMap({ spec }: { spec: any }) {
  const milestones: Milestone[] = Array.isArray(spec?.data?.milestones)
    ? spec.data.milestones
    : Array.isArray(spec?.data?.gates)
      ? (spec.data.gates as any[]).map((g: any) => ({ name: g.name || g.label, title: g.label, outcome: g.owner }))
      : Array.isArray(spec?.data?.items)
        ? spec.data.items
        : []

  if (!milestones.length) return <div className="text-sm opacity-70">No milestones.</div>

  return (
    <div className="glass-card">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-sm font-medium">{spec?.title || 'Milestones'}</div>
        {spec?.description && <div className="text-xs text-white/60">{spec.description}</div>}
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-white/80">Milestone</th>
              <th className="text-left px-3 py-2 font-medium text-white/80">Outcome</th>
              <th className="text-left px-3 py-2 font-medium text-white/80">Est. Time</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i} className="odd:bg-white/[0.02]">
                <td className="px-3 py-2 text-white/80">{m.name || m.title || `M${i + 1}`}</td>
                <td className="px-3 py-2 text-white/80">{m.outcome || ''}</td>
                <td className="px-3 py-2 text-white/80">{m.duration_min ? `${m.duration_min} min` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


