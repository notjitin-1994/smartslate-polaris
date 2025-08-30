import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { StarmapRequestForm } from '@/components/forms/StarmapRequestForm'
import type { StarmapRequestData } from '@/components/forms/StarmapRequestForm'
import { getStarmapById } from '@/services'
import { DynamicQuestionnaire } from '@/components/forms/DynamicQuestionnaire'
import { DynamicLoadingScreen } from '@/components/DynamicLoadingScreen'
import { QuestionnaireHeader } from '@/components/forms/shared/QuestionnaireHeader'
import { HEADER_TITLE } from '@/components/forms/shared/headerCopy'
import { getLoadingSubheading } from '@/components/forms/shared/headerCopy'
import { Building } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function BeginDiscovery() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const stepParam = searchParams.get('step')
  const starmapId = searchParams.get('starmapId')
  const forceLoading = searchParams.get('loading') === '1'
  const starmapIdMemo = useMemo(() => starmapId ?? '', [starmapId])
  
  // Support deep linking to step 2 if query param is present
  const initialStep = stepParam === '2' ? 'group' : 'requestor'
  const [loading, setLoading] = useState<boolean>(!!starmapId)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<StarmapRequestData> | null>(null)
  const [dynamicQuestions, setDynamicQuestions] = useState<any | null>(null)
  const [phase, setPhase] = useState<'static' | 'loading' | 'dynamic'>('static')

  const hasNonEmptyDynamicQuestions = (dq: any): boolean => {
    if (!dq) return false
    if (Array.isArray(dq)) return dq.length > 0
    if (typeof dq === 'object') {
      const stages = (dq as any)?.stages
      if (Array.isArray(stages)) return stages.length > 0
    }
    return false
  }

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancel = false
    async function load() {
      if (!starmapId) return
      try {
        setLoading(true)
        const row = await getStarmapById(starmapId)
        if (cancel) return
        if (!row) {
          setError('Starmap not found')
          return
        }
        // Map persisted JSON into form shape if present
        const source = (row as any)?.form_data || (row as any)?.static_answers || {}
        const requestor = (source as any)?.requestor || undefined
        const group = (source as any)?.group || undefined
        setInitialData({ requestor, group })

        // Decide phase based on presence of dynamic questions
        const dq = (row as any)?.dynamic_questions
        if (hasNonEmptyDynamicQuestions(dq)) {
          setDynamicQuestions(dq)
          setPhase('dynamic')
        } else if (forceLoading) {
          setPhase('loading')
        } else {
          setPhase('static')
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || 'Failed to load starmap')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [starmapId])

  // Poll + realtime for final_report readiness and auto-navigate
  useEffect(() => {
    if (!starmapIdMemo || !forceLoading) return

    const check = async () => {
      const { data } = await supabase
        .from('master_discovery')
        .select('id, final_report')
        .eq('id', starmapIdMemo)
        .maybeSingle()
      const hasReport = !!(data as any)?.final_report?.views?.report?.content
      if (hasReport) navigate(`/discoveries/${starmapIdMemo}`)
    }

    const channel = supabase
      .channel(`md-${starmapIdMemo}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_discovery', filter: `id=eq.${starmapIdMemo}` },
        (payload) => {
          const fr = (payload.new as any)?.final_report
          if (fr?.views?.report?.content) navigate(`/discoveries/${starmapIdMemo}`)
        }
      )
      .subscribe()

    const interval = setInterval(check, 3000)
    check()

    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [starmapIdMemo, forceLoading, navigate])

  const handleComplete = (data: StarmapRequestData) => {
    // In a real app, this would send data to an API
    console.log('Form submission complete:', data)
    
    // You could also redirect to a thank you page or show additional UI
    // For now, the form component handles the success state internally
  }

  // Phase: dynamic questionnaire (resume after generation)
  if (phase === 'dynamic' && dynamicQuestions && starmapId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
        <main role="main" id="starmap-form" className="relative z-10 px-4 pb-16">
          <DynamicQuestionnaire
            recordId={starmapId}
            starmapId={starmapId}
            dynamicQuestions={dynamicQuestions}
            onComplete={() => navigate(`/discoveries/${starmapId}`)}
          />
        </main>
      </div>
    )
  }

  // Phase: loading (rendered inside the master container)
  if (phase === 'loading' && starmapId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl">
            <QuestionnaireHeader
              icon={<Building className="w-full h-full" />}
              title={HEADER_TITLE}
              subtitle={getLoadingSubheading()}
              useSharedContainer
              embedded
              flat
            />

            <div className="mt-4 mb-8 px-1 sm:px-2">
              <div className="h-0.5 bg-gradient-to-r from-primary-400/0 via-primary-400/60 to-primary-400/0 rounded-full" />
            </div>

            <main role="main" id="starmap-form" className="relative z-10 pt-6 pb-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <DynamicLoadingScreen
                    embedded
                    starmapId={starmapId}
                    recordId={starmapId}
                    processingLabel="Solara is Igniting the Stars for Polaris"
                    onComplete={async () => {
                      const row = await getStarmapById(starmapId)
                      const dq = (row as any)?.dynamic_questions
                      if (dq) {
                        setDynamicQuestions(dq)
                        setPhase('dynamic')
                      }
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      {/* Skip navigation link */}
      <a 
        href="#starmap-form" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                   bg-secondary-500 text-white px-4 py-2 rounded-lg z-50 focus:outline-none 
                   focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2 focus:ring-offset-[rgb(var(--bg))]"
      >
        Skip to form
      </a>
      
      

      {/* Form Section */}
      <main role="main" id="starmap-form" className="relative z-10 px-4 pb-16">
        {error ? (
          <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4">{error}</div>
        ) : (
          <StarmapRequestForm 
            onComplete={handleComplete}
            initialStep={initialStep}
            starmapId={starmapId || undefined}
            initialData={initialData || undefined}
            loading={loading}
          />
        )}
      </main>

      {/* Background decoration removed for clean header */}
    </div>
  )
}


