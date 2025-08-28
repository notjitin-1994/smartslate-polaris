import { type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNeedsAnalysisEnabled } from '@/features/needs-analysis/utils/featureFlag'

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

function IconNeedsAnalysis({ className = '' }: { className?: string }) {
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
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
        <span className="inline-flex items-center justify-center h-12 w-12">
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
          onClick={() => navigate('/discover')}
        />
        <ActionCard
          title="Create New Starmap"
          description="Start a new guided discovery with enhanced AI insights and beautiful visualizations."
          icon={IconCompass}
          onClick={() => navigate('/discover')}
        />
        {isNeedsAnalysisEnabled() && (
          <ActionCard
            title="Needs Analysis"
            description="Conduct comprehensive training needs analysis with diagnostic tools and recommendations."
            icon={IconNeedsAnalysis}
            onClick={() => navigate('/needs-analysis')}
          />
        )}
      </div>

      {/* Benefits: Material-inspired elevated cards */}
      <div className="mt-12">
        <header className="mb-7">
          <h2 className="text-2xl font-semibold tracking-tight font-heading text-brand-accent">
            Discover What Polaris Can Do
          </h2>
          <p className="mt-2 text-[13px] sm:text-sm text-white/70 max-w-2xl">
            Scope learning initiatives with adaptive questions, AI research, and editable starmaps—from intake to export.
          </p>
          <div aria-hidden="true" className="mt-4 h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Multi‑Media Support */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-16px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center text-primary-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="13" rx="2.5" />
                  <circle cx="8" cy="10" r="1.2" />
                  <path d="M6.5 15.5l3-3 2.5 2.5 3-3 2.5 2.5" />
                </svg>
              </span>
              <div>
                <div className="mb-1 inline-flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] tracking-wide uppercase text-primary-400 bg-primary-600/10 border border-primary-600/25">Capability</span>
                </div>
                <h3 className="text-[15px] font-semibold text-white/95">Needs Analysis Intake</h3>
                <p className="mt-1 text-[13px] text-white/70">
                  Enter briefs and key details through guided inputs—Polaris analyzes your answers to inform scoping.
                </p>
              </div>
            </div>
          </div>

          {/* AI‑Powered Design */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-16px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center text-secondary-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v4" />
                  <path d="M12 17v4" />
                  <path d="M3 12h4" />
                  <path d="M17 12h4" />
                  <path d="M6 6l2.8 2.8" />
                  <path d="M15.2 15.2L18 18" />
                  <path d="M18 6l-2.8 2.8" />
                  <path d="M6 18l2.8-2.8" />
                </svg>
              </span>
              <div>
                <div className="mb-1 inline-flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] tracking-wide uppercase text-secondary-400 bg-secondary-500/10 border border-secondary-500/25">Intelligence</span>
                </div>
                <h3 className="text-[15px] font-semibold text-white/95">Adaptive Questionnaire</h3>
                <p className="mt-1 text-[13px] text-white/70">
                  Polaris asks targeted follow‑ups and turns goals into clear requirements.
                </p>
              </div>
            </div>
          </div>

          {/* Complete Artifacts */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-16px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center text-primary-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 4h7.5a2.5 2.5 0 0 1 2.5 2.5V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  <path d="M8 8h7" />
                  <path d="M8 12h6" />
                  <path d="M8 16h4" />
                </svg>
              </span>
              <div>
                <div className="mb-1 inline-flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] tracking-wide uppercase text-primary-400 bg-primary-500/10 border border-primary-500/25">Output</span>
                </div>
                <h3 className="text-[15px] font-semibold text-white/95">Starmap & Proposal</h3>
                <p className="mt-1 text-[13px] text-white/70">
                  Generate a structured starmap, proposal, and executive summary—ready to share.
                </p>
              </div>
            </div>
          </div>

          {/* Private & Secure */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-16px_rgba(0,0,0,0.6)]">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center text-secondary-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="9" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <div>
                <div className="mb-1 inline-flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] tracking-wide uppercase text-secondary-400 bg-secondary-600/10 border border-secondary-600/25">Trust</span>
                </div>
                <h3 className="text-[15px] font-semibold text-white/95">Private &amp; Secure</h3>
                <p className="mt-1 text-[13px] text-white/70">
                  Your data stays protected with enterprise‑grade controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


