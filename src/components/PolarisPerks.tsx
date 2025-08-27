import { memo, type ReactNode } from 'react'

type Perk = {
  title: string
  description: string
  icon: ReactNode
}

const IconSpark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary-400">
    <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
  </svg>
)

const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-secondary-500">
    <path d="M3 21h18" />
    <rect x="6" y="11" width="3" height="7" />
    <rect x="11" y="8" width="3" height="10" />
    <rect x="16" y="5" width="3" height="13" />
  </svg>
)

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-emerald-400">
    <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const PERKS: Perk[] = [
  { title: 'Guided discovery', description: 'Structured prompts surface what matters. Get clarity faster.', icon: <IconSpark /> },
  { title: 'Impact-first priorities', description: 'Score by value and effort. Align teams in minutes.', icon: <IconChart /> },
  { title: 'Shareable public views', description: 'Link a polished view for stakeholders with one click.', icon: <IconShield /> },
]

export const PolarisPerks = memo(function PolarisPerks() {
  return (
    <div className="hidden lg:block mt-2 select-none">
      <div role="list" className="grid grid-cols-1 gap-2">
        {PERKS.map((p) => (
          <div
            role="listitem"
            key={p.title}
            className="group relative rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-2.5 overflow-hidden transition-all duration-300 hover:border-primary-400/60 hover:bg-white/7"
          >
            {/* Accent gradient border (Material-esque) */}
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5" aria-hidden />
            <span className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-primary-400/10 via-transparent to-secondary-500/10 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />

            <div className="flex items-start gap-2.5">
              <div className="shrink-0 rounded-md border border-white/10 bg-white/5 p-1.5 shadow-inner">
                {p.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white tracking-tight mb-0.5">{p.title}</div>
                <div className="text-[11px] text-white/70 leading-snug">{p.description}</div>
              </div>
            </div>

            {/* Hover lift */}
            <style>{`.group:hover{transform:translateY(-2px)}`}</style>
          </div>
        ))}
      </div>
    </div>
  )
})

PolarisPerks.displayName = 'PolarisPerks'


