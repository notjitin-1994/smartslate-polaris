import { useState, useEffect, memo } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabase } from '@/services/supabase'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import EnhancedReportDisplay from '@/components/EnhancedReportDisplay'
// Removed unused NAReport/PolarisSummary types to satisfy build

// Glassmorphic Card Component with brand-compliant design [[memory:7262075]]
const GlassCard = memo(({ 
  title, 
  icon, 
  children,
  delay = 0
}: { 
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  delay?: number
}) => {
  return (
    <div 
      className="glass-card-morphic animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400/20 to-primary-500/20 backdrop-blur-md flex items-center justify-center">
          <div className="text-primary-400">{icon}</div>
        </div>
        <h3 className="text-base font-['Quicksand'] font-semibold text-white/90 flex-1">{title}</h3>
      </div>
      <div className="animate-in fade-in duration-500">
        {children}
      </div>
    </div>
  )
})

GlassCard.displayName = 'GlassCard'

// Animated Swirl Background Component with staggered positioning
const SwirlBackground = memo(() => {
  const swirls = [
    { id: 1, size: 200, x: '10%', y: '15%', opacity: 0.15, delay: 0 },
    { id: 2, size: 350, x: '75%', y: '20%', opacity: 0.08, delay: 1500 },
    { id: 3, size: 150, x: '85%', y: '65%', opacity: 0.2, delay: 3000 },
    { id: 4, size: 400, x: '25%', y: '70%', opacity: 0.06, delay: 2000 },
    { id: 5, size: 250, x: '50%', y: '40%', opacity: 0.1, delay: 500 },
    { id: 6, size: 180, x: '5%', y: '85%', opacity: 0.12, delay: 2500 },
    { id: 7, size: 300, x: '60%', y: '80%', opacity: 0.07, delay: 1000 },
    { id: 8, size: 220, x: '35%', y: '10%', opacity: 0.09, delay: 3500 },
  ]
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {swirls.map((swirl) => (
        <div
          key={swirl.id}
          className="absolute animate-float"
          style={{ 
            left: swirl.x, 
            top: swirl.y,
            animationDelay: `${swirl.delay}ms`,
            animationDuration: `${20 + swirl.id * 2}s`
          }}
        >
          <img 
            src="/images/logos/logo-swirl.png" 
            alt=""
            className="select-none"
            style={{ 
              width: `${swirl.size}px`,
              height: `${swirl.size}px`,
              opacity: swirl.opacity,
              filter: 'blur(0.5px)'
            }}
          />
        </div>
      ))}
    </div>
  )
})

SwirlBackground.displayName = 'SwirlBackground'

export default function PublicReportView() {
  const { id } = useParams<{ id: string }>()
  const [reportMarkdown, setReportMarkdown] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadReport() {
      if (!id) {
        setError('No report ID provided')
        setLoading(false)
        return
      }

      try {
        const supabase = getSupabase()
        
        // Try summaries first
        let { data, error: fetchError } = await supabase
          .from('polaris_summaries')
          .select('*')
          .eq('id', id)
          .eq('is_public', true)
          .single()

        // If not found, try starmap_jobs public view as fallback
        if (fetchError || !data) {
          const { data: starmap, error: starmapErr } = await supabase
            .from('starmap_jobs')
            .select('final_report, preliminary_report')
            .eq('id', id)
            .eq('is_public', true)
            .single()
          if (starmapErr || !starmap) {
            setError('Report not found or not publicly available')
            setLoading(false)
            return
          }
          const raw = starmap.final_report || starmap.preliminary_report
          if (!raw) {
            setError('This public starmap has no report content yet')
            setLoading(false)
            return
          }
          const markdown = convertNaJsonStringToMarkdown(raw) || String(raw)
          setReportMarkdown(markdown)
          setLoading(false)
          return
        }
        // Summaries path
        const raw = (data as any)?.needs_analysis_report || (data as any)?.summary_content || ''
        const markdown = typeof raw === 'string' ? (convertNaJsonStringToMarkdown(raw) || raw) : convertNaJsonStringToMarkdown(JSON.stringify(raw))
        setReportMarkdown(markdown || '')
      } catch (err) {
        console.error('Error loading report:', err)
        setError('Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-400 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-4 text-white/60 text-sm animate-pulse font-['Lato']">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-['Quicksand'] font-semibold text-white mb-2">Report Not Available</h2>
          <p className="text-white/60 font-['Lato']">{error}</p>
        </div>
      </div>
    )
  }

  if (!reportMarkdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 font-['Lato']">No report data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] relative overflow-x-hidden">
      {/* Animated Swirl Background */}
      <SwirlBackground />
      
      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-b from-black/40 to-transparent border-b border-white/10 overflow-hidden">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <img src="/images/logos/logo.png" alt="SmartSlate" className="h-8 w-auto" />
            </div>
            <h1 className="mt-2 font-['Lato'] font-semibold text-white text-[0.78rem]">Polaris Starmaps</h1>
          </div>
        </header>

        {/* Report Content - Full Overview */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="p-4 md:p-8">
              <EnhancedReportDisplay reportMarkdown={reportMarkdown} />
            </div>
          </div>
          <div className="mt-12 text-center text-white/50 text-sm font-['Lato']">
            <p>This is a public overview of the comprehensive needs analysis report</p>
            <p className="mt-2">© {new Date().getFullYear()} SmartSlate. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Add glassmorphic styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-15px) rotate(3deg); }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .glass-card-morphic {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          transition: all 0.3s ease;
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
        }
        
        .glass-card-morphic:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          box-shadow: 
            0 12px 48px 0 rgba(31, 38, 135, 0.2),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  )
}
