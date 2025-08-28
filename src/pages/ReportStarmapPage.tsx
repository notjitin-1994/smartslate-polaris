import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { saveAs } from 'file-saver'
import { RichTextEditor } from '@/components/RichTextEditor'
import { htmlToMarkdown, markdownToHtml } from '@/lib/textUtils'
import { getStarmapJob, type StarmapJob, saveJobReport as saveStarmapJobReport } from '@/services/starmapJobsService'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import { copyToClipboard } from '@/utils/shareUtils'
import VisualReportCards from '@/components/VisualReportCards'

/**
 * Polaris Starmap Source Editor
 * Route: /report/starmap/:id
 *
 * Fetches starmap job by id (Supabase) and renders a single
 * "Source Content" editor with rich formatting. Preview view removed.
 */
export default function ReportStarmapPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<StarmapJob | null>(null)
  const [showCopied, setShowCopied] = useState(false)
  const [editorHtml, setEditorHtml] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [columns, setColumns] = useState<1 | 2 | 3>(1)
  const [stickyOffset, setStickyOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<'source' | 'report'>('source')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!id) {
        setError('Missing starmap id')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const { data, error } = await getStarmapJob(id)
        if (error) throw error
        if (mounted) setJob(data)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load starmap')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const markdown = useMemo(() => {
    if (!job) return ''
    const raw = job.final_report || job.preliminary_report || ''
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
    if (text.trim().startsWith('{')) return text
    return convertNaJsonStringToMarkdown(text) || text
  }, [job])

  // Seed editor HTML when markdown becomes available
  useEffect(() => {
    try {
      setEditorHtml(markdownToHtml(markdown))
    } catch {
      setEditorHtml(markdown || '')
    }
  }, [markdown])

  // Align editor toolbar exactly under the portal header
  useEffect(() => {
    function computeOffset() {
      try {
        const main = document.querySelector('main') as HTMLElement | null
        const header = (main?.querySelector('header.sticky') || main?.querySelector('header') || document.querySelector('header.sticky')) as HTMLElement | null
        const height = header?.offsetHeight || 0
        setStickyOffset(height)
      } catch {
        setStickyOffset(0)
      }
    }
    computeOffset()
    const onResize = () => computeOffset()
    window.addEventListener('resize', onResize)
    // Observe header size changes
    let ro: ResizeObserver | null = null
    try {
      const main = document.querySelector('main') as HTMLElement | null
      const header = (main?.querySelector('header.sticky') || main?.querySelector('header') || document.querySelector('header.sticky')) as HTMLElement | null
      if (header && 'ResizeObserver' in window) {
        ro = new ResizeObserver(() => computeOffset())
        ro.observe(header)
      }
    } catch {}
    return () => {
      window.removeEventListener('resize', onResize)
      try { ro?.disconnect() } catch {}
    }
  }, [])

  // Removed legacy overview tips block

  const downloadMarkdown = useCallback(() => {
    if (!job) return
    const md = (() => { try { return htmlToMarkdown(editorHtml) } catch { return markdown || '' } })()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const filename = `${(job.title || 'starmap-report').replace(/\s+/g, '-').toLowerCase()}.md`
    saveAs(blob, filename)
  }, [job, editorHtml, markdown])

  const saveContent = useCallback(async () => {
    if (!job) return
    try {
      setIsSaving(true)
      const md = htmlToMarkdown(editorHtml)
      await saveStarmapJobReport(job.id, 'final', md)
      setJob(prev => prev ? ({ ...prev, final_report: md } as any) : prev)
    } finally {
      setIsSaving(false)
    }
  }, [job, editorHtml])

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading report…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 border border-red-500/30 rounded-lg text-red-100 bg-red-500/15">{error}</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg btn-ghost"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-white/60">Starmap not found.</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 md:mb-8">
        <div className="glass-card p-5 md:p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 relative overflow-hidden z-30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              {job.title || (activeTab === 'source' ? 'Source Content' : 'Report')}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-2 bg-white/5 rounded-xl border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('source')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${activeTab==='source' ? 'bg-white/15 text-white border border-white/15' : 'text-white/80 hover:text-white'}`}
                >
                  Source
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${activeTab==='report' ? 'bg-white/15 text-white border border-white/15' : 'text-white/80 hover:text-white'}`}
                >
                  Report
                </button>
              </div>
              <div className="flex items-center gap-2 mr-2">
                <label className="text-xs text-white/70">Columns</label>
                <select
                  className="brand-select"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value) as 1 | 2 | 3)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <button onClick={downloadMarkdown} className="icon-btn" title="Download Markdown" aria-label="Download Markdown">
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={async () => { const copied = await copyToClipboard(htmlToMarkdown(editorHtml)); if (copied) { setShowCopied(true); setTimeout(() => setShowCopied(false), 1500) } }}
                className="icon-btn"
                title="Copy Markdown"
                aria-label="Copy Markdown"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              </button>
              <button
                onClick={() => { void saveContent() }}
                className="px-3 py-1.5 rounded-lg btn-primary disabled:opacity-50"
                disabled={isSaving}
                title="Save"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCopied && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-xl border border-white/15 bg-white/10 backdrop-blur-md shadow-2xl text-white/90">Markdown copied to clipboard</div>
      )}

      {activeTab === 'source' ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/85 font-medium">Source Content</div>
              </div>
              <div className={`editor-cols cols-${columns}`}>
                <RichTextEditor
                  value={editorHtml}
                  onChange={setEditorHtml}
                  placeholder="Write your report content…"
                  className="brand-scroll"
                  autoGrow={false}
                  maxHeight={720}
                  showFullscreen
                  floatingToolbar
                  stickyOffsetPx={stickyOffset}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/85 font-medium">Report</div>
              </div>
              <VisualReportCards
                reportMarkdown={(() => { try { return htmlToMarkdown(editorHtml) } catch { return markdown || '' } })()}
                reportTitle={job.title || 'Report'}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .glass-card { border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); border-radius: 1rem; backdrop-filter: blur(10px); }
        .editor-cols.cols-1 [contenteditable] { column-count: 1; column-gap: 2rem; }
        .editor-cols.cols-2 [contenteditable] { column-count: 2; column-gap: 2rem; }
        .editor-cols.cols-3 [contenteditable] { column-count: 3; column-gap: 2rem; }
        /* Ensure sticky toolbar context: parent must not have overflow hidden */
        .toolbar.sticky { position: sticky; top: 0; }
      `}</style>
    </div>
  )
}


// Simplified: report preview and analytics removed; source-only editor retained
