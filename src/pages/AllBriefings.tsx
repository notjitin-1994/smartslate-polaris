import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getAllSummaries, 
  deleteSummary, 
  getUserSummaryCount, 
  SUMMARY_LIMIT, 
  type PolarisSummary 
} from '@/services/polarisSummaryService'
import StarmapCard from '@/components/StarmapCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AllStarmaps() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState<PolarisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [summaryCount, setSummaryCount] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const PAGE_SIZE = 5
  
  useDocumentTitle('Smartslate | Starmaps')

  useEffect(() => {
    loadSummaries()
  }, [])

  async function loadSummaries() {
    try {
      setLoading(true)
      setError(null)
      const [summariesResult, countResult] = await Promise.all([
        getAllSummaries(),
        getUserSummaryCount()
      ])

      if (summariesResult.error) {
        setError('Failed to load starmaps')
        console.error('Error loading starmaps:', summariesResult.error)
      } else {
        setSummaries(summariesResult.data || [])
      }

      if (!countResult.error && countResult.count !== null) setSummaryCount(countResult.count)
    } catch (err) {
      setError('Failed to load starmaps')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this starmap?')) return
    try {
      setDeletingId(id)
      const { error } = await deleteSummary(id)
      if (error) {
        alert('Failed to delete starmap')
        console.error('Error deleting starmap:', error)
      } else {
        setSummaries(prev => prev.filter(s => s.id !== id))
        setSummaryCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      alert('Failed to delete starmap')
      console.error('Error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(summaries.length / PAGE_SIZE))
  const startIdx = (page - 1) * PAGE_SIZE
  const visible = summaries.slice(startIdx, startIdx + PAGE_SIZE)

  

  return (
    <div className="px-4 py-6 page-enter">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Polaris Starmaps</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-white/60">
                {summaryCount} of {SUMMARY_LIMIT} starmaps used
              </span>
              {summaryCount >= SUMMARY_LIMIT && (
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
        </div>
        <p className="mt-2 text-sm text-white/60">
          View and manage all your Polaris discovery starmaps
        </p>
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
            onClick={() => navigate('/portal')}
            className="btn-primary mt-4"
          >
            Start Discovery
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-white/80 mb-3 accent-text-soft">Your Starmaps</h2>
          <div className="space-y-3">
            {visible.map((summary) => (
              <StarmapCard
                key={summary.id}
                summary={summary}
                onOpen={(id) => navigate(`/portal/starmaps/${id}`)}
                onDelete={(id) => handleDelete(id)}
                deleting={deletingId === summary.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${n === page ? 'border-primary-400 bg-primary-400/20 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}
                  aria-current={n === page ? 'page' : undefined}
                  aria-label={`Page ${n}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        aria-label="New Discovery"
        onClick={() => navigate('/portal')}
        disabled={summaryCount >= SUMMARY_LIMIT}
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-xl w-14 h-14 flex items-center justify-center bg-gradient-to-r from-secondary-400 to-secondary-500 text-white hover:opacity-95 active:opacity-90 float-button ${summaryCount >= SUMMARY_LIMIT ? 'opacity-60 cursor-not-allowed' : ''}`}
        title={summaryCount >= SUMMARY_LIMIT ? 'Limit reached' : 'Start a new discovery'}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  )
}


