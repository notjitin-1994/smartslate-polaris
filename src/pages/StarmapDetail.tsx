import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSummaryById, type PolarisSummary, updateSummaryTitle } from '@/services/polarisSummaryService'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'

export default function StarmapDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<PolarisSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState<string>('')
  const [savingTitle, setSavingTitle] = useState<boolean>(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        setLoading(true)
        setError(null)
        const { data, error } = await getSummaryById(id)
        if (error) setError('Failed to load starmap')
        else {
          setSummary(data)
          setTitleInput((data?.report_title as string) || '')
        }
      } catch (e) {
        setError('Failed to load starmap')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="text-white/60">Loading starmap…</div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="px-4 py-6">
        <div className="rounded-xl border border-red-400/80 bg-red-500/10 p-4 text-red-200">{error || 'Not found'}</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{summary.company_name || 'Discovery Starmap'}</h1>
          <p className="text-sm text-white/60 mt-1">{new Date(summary.created_at).toLocaleString()}</p>
        </div>
      </div>

      <ReportDisplay
        reportMarkdown={summary.summary_content}
        reportTitle={titleInput.trim() || undefined}
        editableTitle
        savingTitle={savingTitle}
        onSaveTitle={async (newTitle) => {
          if (!id || !newTitle.trim()) return
          try {
            setSavingTitle(true)
            const { error } = await updateSummaryTitle(id, newTitle.trim())
            if (!error) {
              setTitleInput(newTitle.trim())
              setSummary(prev => prev ? { ...prev, report_title: newTitle.trim() } as PolarisSummary : prev)
            }
          } finally {
            setSavingTitle(false)
          }
        }}
      />

      {/* Bottom action bar with brand-aligned Back icon */}
      <div className="flex items-center justify-between gap-2 mt-6">
        <button
          type="button"
          className="icon-btn"
          onClick={() => navigate('/portal/starmaps')}
          aria-label="Back"
          title="Back"
        >
          <svg className="w-4 h-4 accent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}


