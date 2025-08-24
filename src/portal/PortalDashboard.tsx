import { type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'

type ActionCardProps = {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}

function IconArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h16" />
      <path d="M14 6l6 6-6 6" />
    </svg>
  )
}

function IconStarmap({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="9" cy="18" r="2" />
      <path d="M7.5 7.5l8 0.5M7.6 7.9l1.9 7.8M17 9.6l-6.3 7.2" />
    </svg>
  )
}

function IconCompass({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5.2L8 15.5l2.2-5.2L15.5 8.5z" />
      <circle cx="12" cy="12" r="1.3" />
    </svg>
  )
}

function ActionCard({ title, description, icon: Icon, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-left transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 pressable elevate"
    >
      <div className="relative flex items-center gap-4">
        <span className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-white/10 bg-white/5">
          <Icon className="h-6 w-6 text-white/85 group-hover:text-primary-400 transition-colors" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white/95">{title}</div>
          <p className="mt-1 text-sm text-white/60">{description}</p>
        </div>
        <span className="ml-auto opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition will-change-transform text-white/70 group-hover:text-primary-400">
          <IconArrowRight className="h-5 w-5" />
        </span>
      </div>
    </button>
  )
}

export function PortalDashboard() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <ActionCard
          title="View all Starmaps"
          description="Browse, manage, and open your Polaris discovery starmaps."
          icon={IconStarmap}
          onClick={() => navigate('/portal/starmaps')}
        />
        <ActionCard
          title="Discover"
          description="Start a new guided discovery to scope your needs."
          icon={IconCompass}
          onClick={() => navigate('/portal/discover')}
        />
      </div>
    </section>
  )
}


