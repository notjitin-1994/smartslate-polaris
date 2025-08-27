import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type BillingCycle = 'monthly' | 'annual'

type PersonalPlan = {
  id: string
  name: string
  tagline: string
  priceMonthly: number
  introPriceMonthly?: number
  maxConstellationsPerMonth: number
  maxStarmaps: number
  features: string[]
  highlighted?: string[]
  popular?: boolean
}

type TeamPlan = {
  id: string
  name: string
  tagline: string
  pricePerSeatMonthly: number
  seatRange: string
  minSeats: number
  maxSeats: number
  maxConstellationsPerUserPerMonth: number
  maxStarmapsPerUser: number
  features: string[]
  highlighted?: string[]
}

const personalPlans: PersonalPlan[] = [
  {
    id: 'personal-starter',
    name: 'Explorer',
    tagline: 'Begin your cosmic journey',
    priceMonthly: 18,
    introPriceMonthly: 9,
    maxConstellationsPerMonth: 5,
    maxStarmaps: 2,
    features: [
      'AI-powered Report Creation',
      'Public Sharing',
      'Standard Processing Speed'
    ],
    highlighted: ['5 Starmaps/month']
  },
  {
    id: 'personal-pro',
    name: 'Navigator',
    tagline: 'Chart deeper territories',
    priceMonthly: 38,
    introPriceMonthly: 19,
    maxConstellationsPerMonth: 10,
    maxStarmaps: 5,
    features: [
      'Everything in Explorer',
      '1 Iteration of Feedback Addressal per Starmap',
      'Export to Word & PDF',
      'Priority support response',
      'Access to Deeper Research Material & Reporting'
    ],
    highlighted: ['10 Starmaps/month', '5x faster processing'],
    popular: true
  },
  {
    id: 'personal-power',
    name: 'Voyager',
    tagline: 'Unlimited exploration',
    priceMonthly: 69,
    introPriceMonthly: 49,
    maxConstellationsPerMonth: 50,
    maxStarmaps: 20,
    features: [
      'Everything in Navigator',
      'Advanced Research Suite',
      '5 Iteration of Feedback Addressal per Starmap',
      'API access (coming soon)'
    ],
    highlighted: ['50 Starmaps/month', 'Advanced research']
  },
]

const teamPlans: TeamPlan[] = [
  {
    id: 'team-starter',
    name: 'Crew',
    tagline: 'Collaborate across the cosmos',
    pricePerSeatMonthly: 12,
    seatRange: '2–5 seats',
    minSeats: 2,
    maxSeats: 5,
    maxConstellationsPerUserPerMonth: 50,
    maxStarmapsPerUser: 20,
    features: [
      'Shared team workspace',
      'Real-time collaboration',
      'Role-based permissions',
      'Team analytics dashboard',
      'Bulk export options'
    ],
    highlighted: ['Perfect for small teams']
  },
  {
    id: 'team-growth',
    name: 'Fleet',
    tagline: 'Scale your operations',
    pricePerSeatMonthly: 19,
    seatRange: '6–10 seats',
    minSeats: 6,
    maxSeats: 10,
    maxConstellationsPerUserPerMonth: 100,
    maxStarmapsPerUser: 50,
    features: [
      'Everything in Crew',
      'SSO with OAuth/SAML',
      'Advanced user management',
      'Priority support SLA',
      'Custom onboarding'
    ],
    highlighted: ['Best value for growing teams']
  },
  {
    id: 'team-scale',
    name: 'Armada',
    tagline: 'Enterprise-grade exploration',
    pricePerSeatMonthly: 29,
    seatRange: '11–20 seats',
    minSeats: 11,
    maxSeats: 20,
    maxConstellationsPerUserPerMonth: 500,
    maxStarmapsPerUser: 200,
    features: [
      'Everything in Fleet',
      'Custom usage alerts',
      'Dedicated success manager',
      'Quarterly business reviews',
      'Custom integrations'
    ],
    highlighted: ['Volume pricing advantage']
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  useDocumentTitle('Smartslate | Pricing')
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [teamSeats, setTeamSeats] = useState<number>(5)
  const annualMultiplier = 0.3 // 70% discount
  const annualSavings = 0.7 // 70% savings
  const introMultiplier = 0.5 // 50% introductory offer

  // Volume discount logic to encourage 5 seats (Crew), 10 seats (Fleet), and >10 (Armada)
  function computePerSeatWithVolume(plan: TeamPlan, seats: number, cycle: BillingCycle) {
    const base = plan.pricePerSeatMonthly
    let discountPct = 0

    if (plan.id === 'team-starter') {
      // Peak discount at 5 seats (max of range)
      const maxDiscount = 0.12
      const span = Math.max(1, plan.maxSeats - plan.minSeats) // avoid div by 0
      const normalized = Math.max(0, Math.min(plan.maxSeats, seats) - plan.minSeats) / span
      discountPct = normalized * maxDiscount
    } else if (plan.id === 'team-growth') {
      // Peak discount at 6 seats (min of range)
      const maxDiscount = 0.15
      const span = Math.max(1, plan.maxSeats - plan.minSeats)
      const normalized = Math.max(0, Math.min(plan.maxSeats, seats) - plan.minSeats) / span
      discountPct = (1 - normalized) * maxDiscount
    } else if (plan.id === 'team-scale') {
      // Peak discount at 11 seats (min of range)
      const maxDiscount = 0.2
      const span = Math.max(1, plan.maxSeats - plan.minSeats)
      const normalized = Math.max(0, Math.min(plan.maxSeats, seats) - plan.minSeats) / span
      discountPct = (1 - normalized) * maxDiscount
    }

    // Apply out-of-range penalty so off-range plans are less favorable
    let penaltyMultiplier = 1
    if (seats < plan.minSeats) penaltyMultiplier = 1.5
    if (seats > plan.maxSeats) penaltyMultiplier = 2.5

    const monthlyPerSeat = Math.max(1, Math.ceil(base * (1 - discountPct) * penaltyMultiplier))
    const perSeat = cycle === 'monthly' ? monthlyPerSeat : Math.ceil(monthlyPerSeat * annualMultiplier)
    return { perSeat, discountPct }
  }

  const personalPriced = useMemo(() => {
    return personalPlans.map((p) => {
      const baseMonthly = p.priceMonthly
      const introMonthly = typeof p.introPriceMonthly === 'number' ? p.introPriceMonthly : Math.ceil(baseMonthly * introMultiplier)
      const price = billing === 'monthly' ? introMonthly : Math.ceil(baseMonthly * annualMultiplier)
      return {
        ...p,
        price,
        monthlyPrice: baseMonthly,
        savings: billing === 'annual' ? Math.ceil(baseMonthly * annualSavings * 12) : 0,
      }
    })
  }, [billing])

  // Compute per-seat price lazily inside render per tier; no top-level const needed

  function gotoSignup(planId: string) {
    navigate(`/settings?plan=${planId}&billing=${billing}`)
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <header className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-gradient-to-r from-primary-600/20 to-primary-500/20 border border-white/10">
            <span className="text-xs font-medium text-primary-400">✨ Introductory Offer</span>
            <span className="text-xs text-white/80">50% OFF (Monthly) • 70% OFF (Annual)</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Launch Your Ideas Into Orbit
          </h1>
          <p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl mx-auto">
            Transform your thoughts into powerful <span className="text-primary-400 font-medium">Starmaps</span> with AI-powered intelligence
          </p>
          
          {/* Billing Toggle - Material Design Inspired */}
          <div className="relative inline-flex items-center mt-8 p-1 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <button
              type="button"
              className={`relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                billing === 'monthly' 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-white/60 hover:text-white/80'
              }`}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                billing === 'annual' 
                  ? 'bg-[rgb(var(--primary))] text-[#0A1628] shadow-lg border border-white/10' 
                  : 'text-white/60 hover:text-white/80'
              }`}
              onClick={() => setBilling('annual')}
            >
              Annual
            </button>
            <span className="pointer-events-none absolute -top-3 right-2 px-2 py-0.5 rounded-full bg-emerald-400 text-xs font-bold text-[#0A1628] shadow-lg shadow-emerald-500/25">
              INTRO 50% OFF
            </span>
          </div>
          
          {/* Trust Signals */}
          <div className="flex items-center justify-center gap-8 mt-8 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Instant access
            </span>
          </div>
        </header>

        {/* Personal plans */}
        <section id="personal" className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">For Individual Creators</h2>
            <p className="text-white/70">Start your journey through the cosmos of creativity</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {personalPriced.map((p, index) => (
              <div 
                key={p.id} 
                className={`relative group transition-all duration-300 hover:scale-[1.02] animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Popular Badge */}
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 text-[#0A1628] text-xs font-bold shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                <div className={`relative h-full glass-card p-6 border ${
                  p.popular 
                    ? 'border-primary-400/40 bg-gradient-to-br from-primary-500/[0.08] to-primary-500/[0.04] shadow-2xl' 
                    : 'border-white/10 hover:border-white/20'
                }`}>
                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-heading font-bold mb-2">{p.name}</h3>
                    <p className="text-sm text-white/60">{p.tagline}</p>
                  </div>
                  
                  {/* Pricing */}
                  <div className="mb-6">
                    {billing === 'monthly' ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-white/50 line-through text-sm">${p.monthlyPrice}</span>
                          <span className="text-4xl font-bold">${p.price}</span>
                          <span className="text-white/60 text-sm">/month</span>
                        </div>
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-400 text-[#0A1628] text-xs font-bold">
                          50% OFF
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">${p.price}</span>
                          <span className="text-white/60 text-sm">/month</span>
                        </div>
                        <div className="mt-1 text-xs text-primary-400">
                          Save ${p.savings} per year
                        </div>
                        <div className="mt-1 text-xs text-white/80">
                          Total for the year: ${p.price * 12}/yr
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Highlighted Features */}
                  {p.highlighted && (
                    <div className="mb-6 pb-6 border-b border-white/10">
                      {p.highlighted.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-white/90">{h}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Core Limits */}
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-white">{p.maxConstellationsPerMonth}</span>
                        <span className="text-white/70"> Starmaps/mo</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-white">{p.maxStarmaps}</span>
                        <span className="text-white/70"> Saved Starmaps</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features List */}
                  <ul className="space-y-3 mb-8">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <svg className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => gotoSignup(p.id)}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                      p.popular
                        ? 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white hover:shadow-lg hover:shadow-secondary-500/25 transform hover:-translate-y-0.5'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    }`}
                  >
                    {p.popular ? 'Start Free Trial' : `Choose ${p.name}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team plans */}
        <section id="team" className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">For Teams & Organizations</h2>
            <p className="text-white/70 mb-6">Collaborative exploration with unified mission control</p>
            
            {/* Interactive Seat Selector */}
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <label className="text-sm font-medium text-white/80">Team Size:</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTeamSeats(Math.max(1, teamSeats - 1))}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={1}
                  value={teamSeats}
                  onChange={(e) => setTeamSeats(Math.max(1, Number(e.target.value) || 1))}
                  className="input-no-spinner bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-16 text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
                <button
                  type="button"
                  onClick={() => setTeamSeats(teamSeats + 1)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <span className="text-sm text-white/60">seats (2–20)</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {teamPlans.map((t, index) => {
              const active = teamSeats >= t.minSeats && teamSeats <= t.maxSeats
              const { perSeat, discountPct } = computePerSeatWithVolume(t, teamSeats, billing)
              const total = Math.ceil(perSeat * teamSeats)
              const savings = billing === 'annual' ? Math.ceil(total * 0.2 * 12) : 0
              
              return (
                <div 
                  key={t.id} 
                  className={`relative group transition-all duration-300 animate-fade-in-up ${
                    active ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Active Indicator */}
                  {active && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-4 py-1 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 text-[#0A1628] text-xs font-bold shadow-lg">
                        RECOMMENDED FOR {teamSeats} SEATS
                      </div>
                    </div>
                  )}
                  
                  <div className={`relative h-full glass-card p-6 border transition-all duration-300 ${
                    active 
                      ? 'border-primary-400/40 bg-gradient-to-br from-primary-600/[0.05] to-transparent shadow-2xl' 
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    {/* Plan Header */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-heading font-bold mb-2">{t.name}</h3>
                      <p className="text-sm text-white/60 mb-2">{t.tagline}</p>
                      <div className="inline-flex px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-xs font-medium text-white/80">{t.seatRange}</span>
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    <div className="mb-6 pb-6 border-b border-white/10">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-bold">${perSeat}</span>
                        <span className="text-white/60 text-sm">/seat/month</span>
                      </div>
                      {discountPct > 0 && (
                        <div className="text-xs text-green-400">-{Math.round(discountPct * 100)}% volume discount</div>
                      )}
                      
                      <div className="mt-3 p-3 rounded-lg bg-white/5">
                        {billing === 'annual' ? (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-white/70">Total for {teamSeats} seats (year):</span>
                            <span className="text-lg font-bold text-white">${total * 12}/yr</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-white/70">Total for {teamSeats} seats:</span>
                            <span className="text-lg font-bold text-white">${total}/mo</span>
                          </div>
                        )}
                        {billing === 'annual' && savings > 0 && (
                          <div className="text-xs text-green-400 text-right">
                            Save ${savings} annually
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Highlighted Features */}
                    {t.highlighted && (
                      <div className="mb-4">
                        {t.highlighted.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-white/90">{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Core Limits */}
                    <div className="mb-6 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span className="text-white/80">{t.id === 'team-scale' ? 'Unlimited Starmaps/user/mo (fair usage)' : `${t.maxConstellationsPerUserPerMonth} Starmaps/user/mo`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-white/80">{t.maxStarmapsPerUser} Saved starmaps/user</span>
                      </div>
                    </div>
                    
                    {/* Features List */}
                    <ul className="space-y-2 mb-6">
                      {t.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <svg className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-white/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={() => gotoSignup(t.id)}
                      className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white hover:shadow-lg hover:shadow-secondary-500/25 transform hover:-translate-y-0.5'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      {active ? `Deploy ${t.name} →` : 'View Details'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Enterprise */}
        <section id="enterprise" className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">Enterprise Galaxy</h2>
            <p className="text-white/70">Mission-critical infrastructure for interstellar operations</p>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 border border-white/10 shadow-2xl">
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 animate-shimmer" />
            
            <div className="relative p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Content */}
                <div>
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30">
                    <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs font-bold text-purple-400">ENTERPRISE GRADE</span>
                  </div>
                  
                  <h3 className="text-3xl font-heading font-bold mb-3">Infinite Horizons</h3>
                  <p className="text-white/80 mb-6">Built for organizations that demand unlimited scale, uncompromising security, and white-glove support.</p>
                  
                  {/* Enterprise Features Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Unlimited Everything</h4>
                        <p className="text-sm text-white/70">No limits on starmaps or team members</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Advanced Security</h4>
                        <p className="text-sm text-white/70">SSO/SAML, SCIM provisioning, audit logs, and compliance</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Dedicated Support</h4>
                        <p className="text-sm text-white/70">24/7 priority support with 99.9% uptime SLA</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Content - Pricing */}
                <div className="flex flex-col justify-center">
                  <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
                    <div className="mb-4">
                      <span className="text-white/60 text-sm">Starting at</span>
                      <div className="flex items-baseline justify-center gap-1 mt-2">
                        <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">$199/year</span>
                      </div>
                      <p className="text-sm text-white/60 mt-2">Tailored to your needs</p>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Volume discounts available
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Custom contract terms
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Dedicated success team
                      </div>
                    </div>
                    
                    <a 
                      href="mailto:sales@smartslate.io" 
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-secondary-600 to-secondary-500 text-white font-medium hover:shadow-lg hover:shadow-secondary-500/25 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact Sales Team
                    </a>
                    
                    <p className="text-xs text-white/50 mt-3">Response within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-24 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3">Frequently Asked Questions</h2>
            <p className="text-white/70">Everything you need to know about our pricing</p>
          </div>
          
          <div className="max-w-3xl mx-auto grid gap-4">
            <details className="group glass-card p-6 border border-white/10 cursor-pointer">
              <summary className="flex items-center justify-between font-medium text-white list-none">
                What is a Starmap?
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-white/70 text-sm">
                A Starmap is a completed AI-powered report or document creation. Each time you generate a new report, analysis, or document using our AI tools, it counts as one Starmap. Think of it as connecting the dots between your ideas to form a complete picture.
              </p>
            </details>
            
            <details className="group glass-card p-6 border border-white/10 cursor-pointer">
              <summary className="flex items-center justify-between font-medium text-white list-none">
                Can I change plans anytime?
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-white/70 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.
              </p>
            </details>
            
            <details className="group glass-card p-6 border border-white/10 cursor-pointer">
              <summary className="flex items-center justify-between font-medium text-white list-none">
                What happens if I exceed my limits?
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-white/70 text-sm">
                We'll notify you when you're approaching your monthly limits. You can either upgrade to a higher plan or purchase additional Starmaps as needed. Your saved Starmaps are always accessible.
              </p>
            </details>
            
            <details className="group glass-card p-6 border border-white/10 cursor-pointer">
              <summary className="flex items-center justify-between font-medium text-white list-none">
                Is there a free trial?
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-white/70 text-sm">
                Yes! All plans come with a 14-day free trial. No credit card required to start. You'll have full access to all features during your trial period.
              </p>
            </details>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-6 text-sm">
              <a href="#" className="text-white/60 hover:text-white transition-colors">Terms of Service</a>
              <span className="text-white/20">•</span>
              <a href="#" className="text-white/60 hover:text-white transition-colors">Privacy Policy</a>
              <span className="text-white/20">•</span>
              <a href="mailto:support@smartslate.io" className="text-white/60 hover:text-white transition-colors">Support</a>
            </div>
            <p className="text-white/40 text-xs max-w-2xl mx-auto">
              Prices shown in USD. Taxes may apply based on your location. Annual billing saves 70%. 
              Feature limits will be enforced once billing is activated. All plans include 14-day free trial.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}


