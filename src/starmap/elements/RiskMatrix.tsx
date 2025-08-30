export default function RiskMatrix({ spec }: { spec: any }) {
  const matrix: number[][] = Array.isArray(spec?.data?.matrix) ? spec.data.matrix : []
  const labelsX: string[] = spec?.data?.labelsX || ['Low','Med','High']
  const labelsY: string[] = spec?.data?.labelsY || ['Low','Med','High']
  const max = Math.max(1, ...matrix.flat())
  return (
    <div className="overflow-auto glass-card p-3">
      <table className="min-w-[400px] border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs text-white/60">Risk</th>
            {labelsX.map((l, i) => <th key={i} className="p-2 text-xs text-white/60">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={ri}>
              <td className="p-2 text-xs text-white/60">{labelsY[ri] ?? ''}</td>
              {row.map((v, ci) => (
                <td key={ci} className="p-2">
                  <div className="h-8 rounded" style={{ backgroundColor: `rgba(244,63,94,${v/max})` }} aria-label={`Cell ${ri+1},${ci+1} value ${v}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


