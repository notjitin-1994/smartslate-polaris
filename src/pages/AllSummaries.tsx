import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSummaries, deleteSummary, getUserSummaryCount, getUserCreatedCount, CREATION_LIMIT, SAVED_LIMIT, type PolarisSummary } from '@/services/polarisSummaryService'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AllSummaries() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState<PolarisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [summaryCount, setSummaryCount] = useState<number>(0)
  const [createdCount, setCreatedCount] = useState<number>(0)
  
  useDocumentTitle('Smartslate | Starmaps')

  useEffect(() => {
    loadSummaries()
  }, [])

  async function loadSummaries() {
    try {
      setLoading(true)
      setError(null)
      const [summariesResult, countResult, createdResult] = await Promise.all([
        getAllSummaries(),
        getUserSummaryCount(),
        getUserCreatedCount(),
      ])
      
      if (summariesResult.error) {
        setError('Failed to load summaries')
        console.error('Error loading summaries:', summariesResult.error)
      } else {
        setSummaries(summariesResult.data || [])
      }
      
      if (!countResult.error && countResult.count !== null) setSummaryCount(countResult.count)
      if (!createdResult.error && createdResult.count !== null) setCreatedCount(createdResult.count)
    } catch (err) {
      setError('Failed to load summaries')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this summary?')) return
    
    try {
      setDeletingId(id)
      const { error } = await deleteSummary(id)
      
      if (error) {
        alert('Failed to delete summary')
        console.error('Error deleting summary:', error)
      } else {
        setSummaries(prev => prev.filter(s => s.id !== id))
        setSummaryCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      alert('Failed to delete summary')
      console.error('Error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function extractHighlights(markdown: string) {
    const lines = markdown.split('\n').slice(0, 5)
    return lines.join(' ').slice(0, 200) + '...'
  }

  

  return (
    <div className="px-4 py-6 page-enter">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Polaris Starmaps</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                  <svg className="w-3.5 h-3.5 text-primary-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </span>
                <span className="text-xs text-white/70">Created</span>
                <span className="text-xs font-semibold text-white/90">{createdCount}/{CREATION_LIMIT}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10">
                  <svg className="w-3.5 h-3.5 text-secondary-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18"/><path d="M6 7v10a2 2 0 002 2h8a2 2 0 002-2V7"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </span>
                <span className="text-xs text-white/70">Saved</span>
                <span className="text-xs font-semibold text-white/90">{summaryCount}/{SAVED_LIMIT}</span>
              </div>
              {(summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT) && (
                <button
                  type="button"
                  onClick={() => window.open('https://smartslate.io/upgrade', '_blank')}
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Upgrade for more
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-primary w-10 h-10 flex items-center justify-center p-0"
            disabled={summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT}
            title={summaryCount >= SAVED_LIMIT ? 'Saved limit reached' : (createdCount >= CREATION_LIMIT ? 'Creation limit reached' : 'Start a new discovery')}
            aria-label="New Discovery"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-white/60">View and manage all your Polaris discovery starmaps</p>
        {/* Dual-layer progress bar: creation underlay, saved overlay */}
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden relative" aria-label="Starmap usage">
            {/* Creation progress underlay */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20"
              style={{ width: `${Math.min(100, Math.round(((createdCount || 0) / Math.max(1, CREATION_LIMIT)) * 100))}%` }}
              aria-hidden="true"
            />
            {/* Saved progress overlay */}
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all"
              style={{ width: `${Math.min(100, Math.round((summaryCount / Math.max(1, SAVED_LIMIT)) * 100))}%` }}
            />
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400" /> Saved</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-white/30" /> Created</span>
            <span className="ml-auto">Created {createdCount}/{CREATION_LIMIT}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-white/60">Loading starmaps...</div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-400/80 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      ) : summaries.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-white/60">No starmaps yet</div>
          <p className="mt-2 text-sm text-white/40">Complete a Polaris discovery to see your starmaps here</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-primary mt-4"
          >
            Start Discovery
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-white/80 mb-3">Your Starmaps</h2>
          <div className="space-y-3">
            {summaries.map((summary) => (
              <div key={summary.id} className="glass-card p-4 transition-all hover:bg-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white/90 truncate">{summary.report_title || summary.company_name || 'Untitled Discovery'}</h3>
                    <p className="text-xs text-white/60 mt-1">{formatDate(summary.created_at)}</p>
                    <p className="text-xs text-white/50 mt-2 line-clamp-2">{extractHighlights(summary.summary_content)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(summary.id)}
                    disabled={deletingId === summary.id}
                    className="p-1 text-white/40 hover:text-red-400 transition-colors"
                    title="Delete starmap"
                  >
                    {deletingId === summary.id ? (
                      <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating create button for intuitive access */}
      <button
        type="button"
        aria-label="New Discovery"
        onClick={() => navigate('/')}
        disabled={summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT}
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-xl w-14 h-14 flex items-center justify-center bg-gradient-to-r from-primary-400 to-secondary-500 text-slate-900 hover:opacity-95 active:opacity-90 float-button ${(summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT) ? 'opacity-60 cursor-not-allowed' : ''}`}
        title={summaryCount >= SAVED_LIMIT ? 'Saved limit reached' : (createdCount >= CREATION_LIMIT ? 'Creation limit reached' : 'Start a new discovery')}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
