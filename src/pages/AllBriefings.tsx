import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getAllSummaries, 
  deleteSummary, 
  getUserSummaryCount, 
  getUserCreatedCount,
  CREATION_LIMIT,
  SAVED_LIMIT,
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
  const [createdCount, setCreatedCount] = useState<number>(0)
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
      const [summariesResult, countResult, createdResult] = await Promise.all([
        getAllSummaries(),
        getUserSummaryCount(),
        getUserCreatedCount(),
      ])

      if (summariesResult.error) {
        setError('Failed to load starmaps')
        console.error('Error loading starmaps:', summariesResult.error)
      } else {
        setSummaries(summariesResult.data || [])
      }

      if (!countResult.error && countResult.count !== null) setSummaryCount(countResult.count)
      if (!createdResult.error && createdResult.count !== null) setCreatedCount(createdResult.count)
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
        <div className="glass-card p-4 md:p-5 border border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Polaris Starmaps</h1>
              <p className="mt-1 text-xs md:text-sm text-white/70">View and manage all your Polaris discovery starmaps</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`btn-primary whitespace-nowrap ${(summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT) ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT}
              aria-label="Start a new discovery"
            >
              New Discovery
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between gap-3 text-xs text-white/70">
              <span>{summaryCount} of {SAVED_LIMIT} starmaps saved</span>
              {(summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT) && (
                <a
                  href="/pricing"
                  className="text-amber-400 hover:text-amber-300 underline"
                >
                  Upgrade for more
                </a>
              )}
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden relative" aria-label="Starmap usage">
              {/* Creation progress underlay */}
              <div
                className="absolute inset-y-0 left-0 bg-white/20"
                style={{ width: `${Math.min(100, Math.round(((createdCount || 0) / Math.max(1, CREATION_LIMIT)) * 100))}%` }}
                aria-hidden="true"
              />
              {/* Saved progress overlay */}
              <div
                className="relative h-full rounded-full bg-brand-accent transition-all"
                style={{ width: `${Math.min(100, Math.round((summaryCount / Math.max(1, SAVED_LIMIT)) * 100))}%` }}
              />
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-brand-accent" /> Saved</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-white/30" /> Created</span>
              <span className="ml-auto">Created {createdCount}/{CREATION_LIMIT}</span>
            </div>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80 accent-text-soft">Your Starmaps</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4">
            {visible.map((summary) => (
              <StarmapCard
                key={summary.id}
                summary={summary}
                onOpen={(id) => navigate(`/starmaps/${id}`)}
                onDelete={(id) => handleDelete(id)}
                deleting={deletingId === summary.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-5">
              <button
                type="button"
                className="h-7 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
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
                  className={`h-7 min-w-[30px] px-2 text-xs rounded-full transition-colors ${n === page ? 'bg-primary-400/20 text-white border border-primary-400/50' : 'bg-white/5 text-white/70 border border-white/10 hover:text-white'}`}
                  aria-current={n === page ? 'page' : undefined}
                  aria-label={`Page ${n}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="h-7 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
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
        onClick={() => navigate('/')}
        disabled={summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT}
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-xl w-14 h-14 flex items-center justify-center bg-gradient-to-r from-secondary-400 to-secondary-500 text-white hover:opacity-95 active:opacity-90 float-button ${(summaryCount >= SAVED_LIMIT || createdCount >= CREATION_LIMIT) ? 'opacity-60 cursor-not-allowed' : ''}`}
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


