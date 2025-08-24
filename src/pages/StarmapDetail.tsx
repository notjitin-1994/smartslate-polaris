import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSummaryById, type PolarisSummary, updateSummaryTitle, updateSummaryEditedContent, getDisplayContent } from '@/services/polarisSummaryService'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { RichTextEditor } from '@/components/RichTextEditor'

export default function StarmapDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<PolarisSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState<string>('')
  const [savingTitle, setSavingTitle] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

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
          const displayContent = await getDisplayContent(data!)
          setEditedContent(displayContent)
        }
      } catch (e) {
        setError('Failed to load starmap')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function saveEditedContent() {
    if (!id) return
    
    try {
      setSavingEdit(true)
      const { error } = await updateSummaryEditedContent(id, editedContent)
      if (error) {
        setError('Failed to save edits')
      } else {
        setIsEditMode(false)
        setSummary(prev => prev ? { ...prev, edited_content: editedContent, is_edited: true } as PolarisSummary : prev)
      }
    } finally {
      setSavingEdit(false)
    }
  }

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
          <p className="text-sm text-white/60 mt-1">
            {new Date(summary.created_at).toLocaleString()}
            {summary.is_edited && <span className="ml-2 text-xs text-primary-400">(Edited)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setIsEditMode(true)}
            >
              Edit Report
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  getDisplayContent(summary).then(setEditedContent)
                  setIsEditMode(false)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={saveEditedContent}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditMode ? (
        <ReportDisplay
          reportMarkdown={editedContent}
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
      ) : (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Edit Your Report</h3>
          <RichTextEditor
            value={editedContent}
            onChange={setEditedContent}
            placeholder="Edit your report content..."
            maxWords={5000}
            className="min-h-[500px]"
          />
        </div>
      )}

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


