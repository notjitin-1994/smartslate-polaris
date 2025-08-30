export default function ProgressRing({ spec }: { spec: any }) {
  const size = spec?.data?.size ?? 120
  const stroke = spec?.data?.stroke ?? 10
  const value: number = Math.max(0, Math.min(100, Number(spec?.data?.value ?? 0)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const a11y = spec?.a11y?.ariaLabel || `Progress ${value}%`
  const color = spec?.data?.color || '#22d3ee'
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
      <svg width={size} height={size} role="img" aria-label={a11y}>
        <circle stroke="rgba(255,255,255,0.15)" fill="transparent" strokeWidth={stroke} r={radius} cx={size/2} cy={size/2} />
        <circle
          stroke={color} fill="transparent" strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset}
          r={radius} cx={size/2} cy={size/2} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div>
        <div className="text-2xl font-semibold">{value}%</div>
        {spec?.title && <div className="text-sm text-white/70">{spec.title}</div>}
      </div>
    </div>
  )
}


