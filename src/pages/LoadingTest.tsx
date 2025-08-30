import { useState } from 'react'
import { DynamicLoadingScreen } from '@/components/DynamicLoadingScreen'
import { FinalReportLoadingScreen } from '@/components/FinalReportLoadingScreen'

export default function LoadingTest() {
  const [tab, setTab] = useState<'dynamic' | 'final'>('dynamic')
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTab('dynamic')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'dynamic' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Dynamic Questions Loader
          </button>
          <button
            type="button"
            onClick={() => setTab('final')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'final' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Final Report Loader
          </button>
        </div>
      </div>

      <div className="mt-6">
        {tab === 'dynamic' ? (
          <DynamicLoadingScreen embedded demoMode processingLabel="Solara is Igniting the Stars for Polaris" />
        ) : (
          <FinalReportLoadingScreen embedded processingLabel="Solara is Igniting the Stars for Polaris" />
        )}
      </div>
    </div>
  )
}


