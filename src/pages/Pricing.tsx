import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, BadgePercent, Calendar, Globe, Info } from 'lucide-react'
import HeaderSwirlBackground from '@/components/HeaderSwirlBackground'
import StarryBackground from '@/components/StarryBackground'

type BillingCycle = 'monthly' | 'annual'

type PlanFamilyKey = 'Explorer' | 'Navigator' | 'Voyager'
type TierKey = 'Trailhead' | 'Wayfinder' | 'Lodestar'

const TIER_LABELS: TierKey[] = ['Trailhead', 'Wayfinder', 'Lodestar']
const PLAN_FAMILIES: PlanFamilyKey[] = ['Explorer', 'Navigator', 'Voyager']

// Base monthly prices in USD ($)
const BASE_MONTHLY_PRICES: Record<PlanFamilyKey, Record<TierKey, number>> = {
  Explorer: { Trailhead: 19, Wayfinder: 39, Lodestar: 49 },
  Navigator: { Trailhead: 29, Wayfinder: 49, Lodestar: 59 },
  Voyager: { Trailhead: 39, Wayfinder: 59, Lodestar: 69 },
}

const ANNUAL_DISCOUNT = 0.20 // 20% off yearly vs 12 x monthly
const PROMO_DISCOUNT = 0.47  // 47% off during launch window

// Promo ends on October 3, 2025 5:30 PM IST (UTC+5:30) → Z time below for accuracy
const PROMO_END = new Date('2025-10-03T17:30:00+05:30')

function useCountdown(targetDate: Date) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const msLeft = Math.max(0, targetDate.getTime() - now.getTime())
  const totalSeconds = Math.floor(msLeft / 1000)
  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const expired = msLeft <= 0
  return { days, hours, minutes, seconds, expired, msLeft }
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function computePrice(params: { family: PlanFamilyKey; tier: TierKey; billing: BillingCycle; promoActive: boolean }) {
  const baseMonthly = BASE_MONTHLY_PRICES[params.family][params.tier]
  const price = params.billing === 'monthly'
    ? baseMonthly
    : Math.round(baseMonthly * 12 * (1 - ANNUAL_DISCOUNT))

  if (!params.promoActive) return { original: price, final: price }
  const discounted = Math.round(price * (1 - PROMO_DISCOUNT))
  return { original: price, final: discounted }
}

// Track-level positioning (concise, user-friendly microcopy)
const FAMILY_TAGLINES: Record<PlanFamilyKey, string> = {
  Explorer: 'Get started with the essentials and guided flows',
  Navigator: 'Scale collaboration and insights across teams',
  Voyager: 'Advanced automation and controls for enterprises',
}

const FAMILY_FEATURES: Record<PlanFamilyKey, string[]> = {
  Explorer: [
    'Great for a single team or early-stage usage',
    'Best-practice templates and guided setup',
    'Email support',
  ],
  Navigator: [
    'Multiple teams and stakeholder collaboration',
    'Advanced insights and prioritization tools',
    'Priority support',
  ],
  Voyager: [
    'Enterprise scale, governance and SSO',
    'Automation and custom integrations',
    'White‑glove support',
  ],
}

function Badge({ children, tone = 'accent' }: { children: string; tone?: 'accent' | 'neutral' | 'danger' }) {
  const toneClasses = {
    accent: 'bg-secondary-500/20 text-primary-500 border-secondary-500/40',
    neutral: 'bg-white/10 text-white/80 border-white/20',
    danger: 'bg-red-500/15 text-red-300 border-red-500/40',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide uppercase ${toneClasses}`}>
      {children}
    </span>
  )
}

function Toggle({ value, onChange }: { value: BillingCycle; onChange: (v: BillingCycle) => void }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
      <button
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${value === 'monthly' ? 'bg-secondary-500 text-white shadow-md' : 'text-white/80 hover:bg-white/10'}`}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
      <button
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${value === 'annual' ? 'bg-secondary-500 text-white shadow-md' : 'text-white/80 hover:bg-white/10'}`}
        onClick={() => onChange('annual')}
      >
        Annual
      </button>
    </div>
  )
}

type TierCardProps = {
  family: PlanFamilyKey
  tier: TierKey
  billing: BillingCycle
  promoActive: boolean
}

function TierCard({ family, tier, billing, promoActive }: TierCardProps) {
  const { original, final } = computePrice({ family, tier, billing, promoActive })
  const isDiscounted = promoActive && final < original
  const unit = billing === 'monthly' ? '/mo' : '/yr'
  const subNote = useMemo(() => {
    if (billing === 'monthly') return isDiscounted ? '47% off first month' : 'Billed monthly'
    return isDiscounted ? '47% off first year' : 'Annual: 20% less than monthly'
  }, [billing, isDiscounted])

  return (
    <div className="glass-card elevate h-full flex flex-col">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">{family}</div>
          <h3 className="text-xl">{tier}</h3>
        </div>
        <div className="flex items-center gap-2">
          {billing === 'annual' && <Badge>Annual -20%</Badge>}
          {isDiscounted && <Badge tone="accent">Launch -47%</Badge>}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-end gap-3">
          {isDiscounted && (
            <div className="text-white/60 line-through text-lg">{formatUSD(original)}{unit}</div>
          )}
          <div className="text-4xl font-bold">{formatUSD(final)}<span className="text-lg text-white/70 align-top">{unit}</span></div>
        </div>
        <div className="text-xs text-white/70">{subNote}</div>

        <ul className="mt-2 space-y-2 text-sm text-white/85">
          <li>• Brand-aligned experience with Solara, Polaris & Starmap flows</li>
          <li>• Material-inspired, minimal UI with interactive guidance</li>
          <li>• Priority email support and roadmap visibility</li>
        </ul>

        <button className="btn-primary mt-2 pressable">Choose {family} {tier}</button>
      </div>
    </div>
  )
}

export default function Pricing() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const { days, hours, minutes, seconds, expired } = useCountdown(PROMO_END)
  const promoActive = !expired
  const [selectedFamily, setSelectedFamily] = useState<PlanFamilyKey | null>(null)
  const [animPhase, setAnimPhase] = useState<'families' | 'tiers'>('families')

  return (
    <div className="relative min-h-screen">
      {/* Ambient brand backgrounds */}
      <div className="absolute inset-0">
        <HeaderSwirlBackground className="z-0" />
        <StarryBackground />
      </div>

      {/* Page content */}
      <div className="relative z-10">
        {/* Hero section */}
        <header className="pt-20 pb-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl leading-tight">
                  Pricing that scales with your journey
                </h1>
                <p className="text-white/80 mt-3 max-w-2xl">
                  Three tracks — Explorer, Navigator, and Voyager — each with progressive tiers: Trailhead, Wayfinder, and Lodestar. Choose monthly, or save with annual.
                </p>
              </div>
              {/* Right column intentionally empty; toggle/countdown moves below header */}
            </div>
          </div>
        </header>

        {/* Billing & promo container under header */}
        <section className="px-6 -mt-4 mb-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="grid items-center gap-4 sm:grid-cols-3">
                <div className="sm:col-start-2 flex justify-center">
                  <Toggle value={billing} onChange={setBilling} />
                </div>
                <div className="sm:col-start-3 text-center sm:text-right w-full sm:w-auto">
                  {promoActive ? (
                    <div>
                      <div className="flex items-center gap-2 justify-center sm:justify-end">
                        <Badge tone="accent">Limited • 47% off</Badge>
                        <span className="text-sm text-white/80">Ends Oct 3, 5:30 PM IST</span>
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {days}d {String(hours).padStart(2,'0')}h {String(minutes).padStart(2,'0')}m {String(seconds).padStart(2,'0')}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-white/70">
                      Launch window pricing has ended. Standard rates apply.
                    </div>
                  )}
                </div>
              </div>

              {/* Moved section heading inside the new header */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <h2 className="text-2xl heading-accent">Choose your track</h2>
                <p className="text-white/70 text-sm mt-1">Start with Explorer, Navigator, or Voyager.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cards grid (two-step flow) */}
        <main className="px-6 pb-20">
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Families step */}
            {animPhase === 'families' && (
              <section className="page-enter">
                {/* Section heading moved to the header container above */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {PLAN_FAMILIES.map((family, idx) => {
                    // compute starting price for this family based on the lowest tier
                    const baseMonthly = BASE_MONTHLY_PRICES[family]['Trailhead']
                    const startPriceMonthly = baseMonthly
                    const startPriceAnnual = Math.round(baseMonthly * 12 * (1 - ANNUAL_DISCOUNT))
                    return (
                      <div key={family} className={`glass-card elevate overflow-hidden animate-fade-in-up ${idx === 1 ? 'animate-delay-150' : idx === 2 ? 'animate-delay-300' : ''}`}>
                        <div className="p-6 flex flex-col gap-4 h-full">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/60">Track</div>
                              <h3 className="text-2xl">{family}</h3>
                            </div>
                            <Badge tone="accent">Popular</Badge>
                          </div>
                          <p className="text-white/80 text-sm">{FAMILY_TAGLINES[family]}</p>

                          <div className="bg-transparent border border-primary-500/40 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-white/70">Prices start at</div>
                              <div className="flex items-center gap-2">
                                {billing === 'annual' && <Badge>Annual -20%</Badge>}
                                {promoActive && <Badge tone="accent">Launch -47%</Badge>}
                              </div>
                            </div>
                            <div className="mt-1 flex items-baseline gap-3">
                              <div className="text-3xl font-bold">{formatUSD(billing === 'monthly' ? startPriceMonthly : startPriceAnnual)}</div>
                              <span className="text-white/70">{billing === 'monthly' ? '/mo' : '/yr'}</span>
                            </div>
                            <div className="text-xs text-white/70 mt-1">{billing === 'annual' ? 'Annual includes 20% off' : 'Billed monthly'}</div>
                          </div>

                          <ul className="mt-1 space-y-2 text-sm text-white/85">
                            {FAMILY_FEATURES[family].map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary-400 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-auto flex items-center justify-between gap-3">
                            <button
                              className="btn-ghost"
                              onClick={() => {
                                setSelectedFamily(family)
                                setTimeout(() => setAnimPhase('tiers'), 120)
                              }}
                            >
                              Compare tiers
                            </button>
                            <button
                              className="btn-primary pressable"
                              onClick={() => {
                                setSelectedFamily(family)
                                setTimeout(() => setAnimPhase('tiers'), 120)
                              }}
                            >
                              Explore {family}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Tiers step */}
            {animPhase === 'tiers' && selectedFamily && (
              <section className="page-enter">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <button
                      className="btn-text -ml-2"
                      onClick={() => {
                        setAnimPhase('families')
                        setSelectedFamily(null)
                      }}
                    >
                      ← Back
                    </button>
                    <h2 className="text-2xl heading-accent mt-2">{selectedFamily} tiers</h2>
                    <p className="text-white/70 text-sm mt-1">Choose Trailhead, Wayfinder, or Lodestar.</p>
                  </div>
                  <div className="text-sm text-white/70">Billing: {billing === 'annual' ? 'Annual (20% off)' : 'Monthly'}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {TIER_LABELS.map((tier, idx) => (
                    <div key={`${selectedFamily}-${tier}`} className={`animate-fade-in-up ${idx === 1 ? 'animate-delay-150' : idx === 2 ? 'animate-delay-300' : ''}`}>
                      <TierCard family={selectedFamily} tier={tier} billing={billing} promoActive={promoActive} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notes & policies – friendlier, icon-led */}
            <section className="read-surface p-6">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-primary-400" />
                <h3 className="text-xl">About pricing</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-transparent rounded-xl p-4 border border-primary-500/40">
                  <div className="flex items-center gap-2 text-white">
                    <BadgePercent className="w-4 h-4 text-primary-300" />
                    <span className="font-medium">Annual saves 20%</span>
                  </div>
                  <p className="text-white/75 mt-1">Yearly billing is 20% less than paying monthly for 12 months.</p>
                </div>
                <div className="bg-transparent rounded-xl p-4 border border-primary-500/40">
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-primary-300" />
                    <span className="font-medium">Launch promo 47%</span>
                  </div>
                  <p className="text-white/75 mt-1">For a limited time, get 47% off the first month (monthly) or first year (annual). Ends Oct 3, 2025, 5:30 PM IST.</p>
                </div>
                <div className="bg-transparent rounded-xl p-4 border border-primary-500/40">
                  <div className="flex items-center gap-2 text-white">
                    <Globe className="w-4 h-4 text-primary-300" />
                    <span className="font-medium">Transparent pricing</span>
                  </div>
                  <p className="text-white/75 mt-1">Prices shown in USD. Taxes may apply based on your location.</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}


