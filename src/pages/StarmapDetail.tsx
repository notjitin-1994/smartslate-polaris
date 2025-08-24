import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSummaryById, type PolarisSummary, updateSummaryTitle, updateSummaryEditedContent, getDisplayContent } from '@/services/polarisSummaryService'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { AIReportEditorEnhanced } from '@/components/AIReportEditorEnhanced'
import { SolaraLodestar } from '@/components'
import { IconButton } from '@/components/ui/IconButton'

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
          const displayContent = getDisplayContent(data!)
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
      {/* Lodestar only while editing existing report */}
      {isEditMode && <SolaraLodestar />}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate('/portal/starmaps')}
            aria-label="Back"
            title="Back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">{(titleInput && titleInput.trim()) || summary.report_title || summary.company_name || 'Discovery Starmap'}</h1>
            <div className="text-xs text-white/60 mt-0.5">
              {new Date(summary.created_at).toLocaleString()}
              {summary.is_edited && <span className="ml-2 text-xs text-primary-400">(Edited)</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <IconButton ariaLabel="Edit report" onClick={() => setIsEditMode(true)} size="sm" title="Edit report">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </IconButton>
          ) : (
            <>
              <IconButton
                ariaLabel="Cancel edits"
                title="Cancel edits"
                onClick={() => {
                  setEditedContent(getDisplayContent(summary))
                  setIsEditMode(false)
                }}
                size="sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Save changes"
                title="Save changes"
                onClick={saveEditedContent}
                disabled={savingEdit}
                variant="primary"
                size="sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </IconButton>
            </>
          )}
        </div>
      </div>

      {!isEditMode ? (
        <ReportDisplay
          reportMarkdown={editedContent}
          reportTitle={titleInput.trim() || undefined}
          editableTitle={false}
          savingTitle={savingTitle}
          hideTitleSection
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="flex-1 input"
              placeholder="Report title"
            />
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={savingTitle || !titleInput.trim()}
              onClick={async () => {
                if (!id || !titleInput.trim()) return
                try {
                  setSavingTitle(true)
                  const { error } = await updateSummaryTitle(id, titleInput.trim())
                  if (!error) {
                    setTitleInput(titleInput.trim())
                    setSummary(prev => prev ? { ...prev, report_title: titleInput.trim() } as PolarisSummary : prev)
                  }
                } finally {
                  setSavingTitle(false)
                }
              }}
              title="Save title"
            >
              {savingTitle ? 'Saving…' : 'Save title'}
            </button>
          </div>
          <AIReportEditorEnhanced
            summaryId={id}
            reportContent={editedContent}
            greetingReport={summary.greeting_report as string || ''}
            orgReport={summary.org_report as string || ''}
            requirementReport={summary.requirement_report as string || ''}
            maxEdits={3}
            onContentChange={setEditedContent}
            className="min-h-[600px]"
          />
        </div>
      )}

      
    </div>
  )
}


