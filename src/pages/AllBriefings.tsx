import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getAllSummaries, 
  deleteSummary, 
  getUserSummaryCount, 
  SUMMARY_LIMIT, 
  type PolarisSummary 
} from '@/services/polarisSummaryService'
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
    const lines = markdown.split('\n').slice(0, 6)
    const raw = lines.join('\n')
    return raw.length > 400 ? raw.slice(0, 400) + '...' : raw
  }

  function toHtmlPreview(markdown: string) {
    try {
      const preview = extractHighlights(markdown)
      let html = preview
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // Headings (#..######)
      html = html
        .replace(/^######\s+(.+)$/gim, '<span class="text-[11px] font-semibold text-white/80">$1</span>')
        .replace(/^#####\s+(.+)$/gim, '<span class="text-[12px] font-semibold text-white/85">$1</span>')
        .replace(/^####\s+(.+)$/gim, '<span class="text-[12px] font-semibold text-white/85">$1</span>')
        .replace(/^###\s+(.+)$/gim, '<span class="text-[13px] font-semibold text-white/85">$1</span>')
        .replace(/^##\s+(.+)$/gim, '<span class="text-sm font-semibold text-white/85">$1</span>')
        .replace(/^#\s+(.+)$/gim, '<span class="text-sm font-semibold text-white/90">$1</span>')

      // Lists (unordered and ordered)
      html = html
        .replace(/^\s*[-*+]\s+(.*)$/gim, '<span class="mr-1 text-primary-400">•</span><span>$1</span>')
        .replace(/^\s*\d+\.\s+(.*)$/gim, '<span class="mr-1 text-primary-400">•</span><span>$1</span>')

      // Bold / italic
      html = html
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white/90">$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')

      // Paragraph spacing and single line breaks
      html = html.replace(/\n{2,}/g, '<br />').replace(/\n/g, ' ')

      return html
    } catch {
      return extractHighlights(markdown)
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
              <div key={summary.id} className="glass-card p-4 transition-all hover:bg-white/10">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/portal/starmaps/${summary.id}`)}
                    className="text-left flex-1 min-w-0"
                  >
                    <h3 className="font-semibold text-white/90 truncate">{summary.report_title || summary.company_name || 'Untitled Discovery'}</h3>
                    <p className="text-xs text-white/60 mt-1">{formatDate(summary.created_at)}</p>
                    <div
                      className="text-xs text-white/70 mt-2 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: toHtmlPreview(summary.summary_content) }}
                    />
                  </button>
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
        className={`fixed bottom-6 right-6 z-40 rounded-full shadow-xl px-5 py-3 text-sm font-semibold bg-gradient-to-r from-secondary-400 to-secondary-500 text-white hover:opacity-95 active:opacity-90 float-button ${summaryCount >= SUMMARY_LIMIT ? 'opacity-60 cursor-not-allowed' : ''}`}
        title={summaryCount >= SUMMARY_LIMIT ? 'Limit reached' : 'Start a new discovery'}
      >
        + New Discovery
      </button>
    </div>
  )
}


