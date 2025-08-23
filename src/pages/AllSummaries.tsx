import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSummaries, deleteSummary, type PolarisSummary } from '@/services/polarisSummaryService'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AllSummaries() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState<PolarisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<PolarisSummary | null>(null)
  
  useDocumentTitle('Smartslate | All Summaries')

  useEffect(() => {
    loadSummaries()
  }, [])

  async function loadSummaries() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await getAllSummaries()
      
      if (error) {
        setError('Failed to load summaries')
        console.error('Error loading summaries:', error)
      } else {
        setSummaries(data || [])
      }
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
        if (selectedSummary?.id === id) {
          setSelectedSummary(null)
        }
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
          <h1 className="text-2xl font-bold text-white">All Polaris Summaries</h1>
          <button
            type="button"
            onClick={() => navigate('/polaris')}
            className="btn-primary text-sm"
          >
            New Discovery
          </button>
        </div>
        <p className="mt-2 text-sm text-white/60">
          View and manage all your Polaris discovery summaries
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-white/60">Loading summaries...</div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-400/80 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      ) : summaries.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-white/60">No summaries yet</div>
          <p className="mt-2 text-sm text-white/40">
            Complete a Polaris discovery to see your summaries here
          </p>
          <button
            type="button"
            onClick={() => navigate('/polaris')}
            className="btn-primary mt-4"
          >
            Start Discovery
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summaries List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-white/80 mb-3">Your Summaries</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  className={`glass-card p-4 cursor-pointer transition-all hover:bg-white/10 ${
                    selectedSummary?.id === summary.id ? 'border-primary-400 bg-white/10' : ''
                  }`}
                  onClick={() => setSelectedSummary(summary)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white/90 truncate">
                        {summary.company_name || 'Untitled Discovery'}
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        {formatDate(summary.created_at)}
                      </p>
                      <p className="text-xs text-white/50 mt-2 line-clamp-2">
                        {extractHighlights(summary.summary_content)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(summary.id)
                      }}
                      disabled={deletingId === summary.id}
                      className="p-1 text-white/40 hover:text-red-400 transition-colors"
                      title="Delete summary"
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

          {/* Selected Summary Detail */}
          <div className="lg:col-span-2">
            {selectedSummary ? (
              <div className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {selectedSummary.company_name || 'Discovery Summary'}
                    </h2>
                    <p className="text-sm text-white/60 mt-1">
                      Created on {formatDate(selectedSummary.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSummary.summary_content)
                        alert('Summary copied to clipboard!')
                      }}
                      className="btn-ghost px-3 py-2 text-sm"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([selectedSummary.summary_content], { type: 'text/markdown' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${selectedSummary.company_name || 'summary'}-${new Date(selectedSummary.created_at).toISOString().split('T')[0]}.md`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="btn-ghost px-3 py-2 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-white/80"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedSummary.summary_content
                        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white/90 mt-4 mb-2">$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white/95 mt-6 mb-3">$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-3">$1</h1>')
                        .replace(/^\*\s+(.*)$/gim, '<ul class="list-disc list-inside mb-2"><li class="text-white/80">$1</li></ul>')
                        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white/90">$1</strong>')
                        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-white/10 rounded text-primary-400">$1</code>')
                        .replace(/\n/g, '<br />')
                    }}
                  />
                </div>

                {/* Show stage details */}
                <details className="mt-6 border-t border-white/10 pt-4">
                  <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80">
                    View Discovery Details
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white/80 mb-2">Stage 1 Answers</h4>
                      <pre className="text-xs bg-white/5 p-3 rounded-md overflow-auto border border-white/10 text-white/70">
                        {JSON.stringify(selectedSummary.stage1_answers, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white/80 mb-2">Stage 2 Answers</h4>
                      <pre className="text-xs bg-white/5 p-3 rounded-md overflow-auto border border-white/10 text-white/70">
                        {JSON.stringify(selectedSummary.stage2_answers, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white/80 mb-2">Stage 3 Answers</h4>
                      <pre className="text-xs bg-white/5 p-3 rounded-md overflow-auto border border-white/10 text-white/70">
                        {JSON.stringify(selectedSummary.stage3_answers, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <div className="text-white/60">Select a summary to view details</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
