import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getStarmapJob, type StarmapJob } from '@/services/starmapJobsService'
import EnhancedReportDisplay from '@/components/EnhancedReportDisplay'
import { updateStarmapJobTitle } from '@/services/starmapJobsService'
import { IconButton } from '@/components'
import { regenerateStarmapFinalReportWithContext } from '@/services/reportGenerationService'

export default function StarmapJobViewer() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [job, setJob] = useState<StarmapJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Regenerate modal state
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenText, setRegenText] = useState('')
  const [regenJson, setRegenJson] = useState<any>(null)
  const [regenJsonName, setRegenJsonName] = useState<string | null>(null)
  const [regenJsonError, setRegenJsonError] = useState<string | null>(null)
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [preserveStructure, setPreserveStructure] = useState(true)
  const [updateOnlySelected, setUpdateOnlySelected] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await getStarmapJob(id)
        if (error) throw error
        if (mounted) setJob(data)
      } catch (e: any) {
        setError(e?.message || 'Failed to load starmap')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading starmap...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 border border-red-500/30 rounded-lg text-red-100 bg-red-500/15">{error}</div>
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

  const markdown = job.final_report || job.preliminary_report || ''

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {markdown ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="p-4 md:p-8">
            <EnhancedReportDisplay 
              reportMarkdown={markdown}
              reportTitle={job.title || 'Needs Analysis Report'}
              showGeneratedDate={false}
              editableTitle
              onSaveTitle={async (newTitle: string) => {
                const trimmed = newTitle.trim()
                if (!trimmed || !job) return
                const { error } = await updateStarmapJobTitle(job.id, trimmed)
                if (!error) setJob({ ...job, title: trimmed })
              }}
              headerActions={(
                <div className="flex items-center gap-2">
                  <IconButton
                    ariaLabel="Recreate Report"
                    title="Recreate Report"
                    variant="ghost"
                    className="icon-btn-lg"
                    onClick={() => setRegenOpen(true)}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.37 4.37A9 9 0 0020.49 15" />
                    </svg>
                  </IconButton>
                </div>
              )}
              prelimReport={job.preliminary_report || undefined}
              summaryId={job.legacy_summary_id}
              starmapJobId={job.id}
            />
          </div>
        </div>
      ) : (
        <div className="text-center text-white/60 py-20">
          <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No report data available for this starmap yet.</p>
        </div>
      )}
      {/* Regenerate Modal (inline on viewer) */}
      {regenOpen && job && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[rgb(var(--bg))]/70 backdrop-blur-sm" onClick={() => !regenerating && setRegenOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-500/20 text-secondary-300 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.37 4.37A9 9 0 0020.49 15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold text-white">Add Context & Recreate</h3>
                    <p className="text-xs md:text-sm text-white/60">Integrate additional details to regenerate the final report</p>
                  </div>
                </div>
                <button
                  onClick={() => setRegenOpen(false)}
                  disabled={regenerating}
                  aria-label="Close"
                  className="icon-btn icon-btn-ghost disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-5 space-y-6 max-h-[72vh] overflow-y-auto brand-scroll">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Additional Context</label>
                    <span className="text-xs text-white/50">Tip: describe updates, constraints, assumptions</span>
                  </div>
                  <textarea
                    className="w-full min-h-[140px] rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400/40 brand-scroll"
                    placeholder="Paste notes, requirements, changes, or clarifications to integrate into the full report..."
                    value={regenText}
                    onChange={(e) => setRegenText(e.target.value)}
                    disabled={regenerating}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Attach JSON (optional)</label>
                    <span className="text-xs text-white/50">Structured data for precise updates</span>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/5 transition p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/85">
                          {regenJson ? (
                            <span>Attached: <span className="text-white/70">{regenJsonName || 'JSON file'}</span></span>
                          ) : (
                            <span>Drag & drop a JSON file here, or click Browse</span>
                          )}
                        </p>
                        <p className="text-xs text-white/50">Max 1 file • .json</p>
                      </div>
                      {!regenJson ? (
                        <label className="px-3 py-2 rounded-lg btn-ghost cursor-pointer">
                          <input
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                              setRegenJsonError(null)
                              const f = e.target.files && e.target.files[0]
                              if (!f) { setRegenJson(null); setRegenJsonName(null); return }
                              const reader = new FileReader()
                              reader.onload = () => {
                                try {
                                  const parsed = JSON.parse(String(reader.result || '{}'))
                                  setRegenJson(parsed)
                                  setRegenJsonName(f.name)
                                } catch (err: any) {
                                  setRegenJsonError('Failed to parse JSON file')
                                  setRegenJson(null)
                                  setRegenJsonName(null)
                                }
                              }
                              reader.readAsText(f)
                            }}
                            disabled={regenerating}
                          />
                          Browse
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setRegenJson(null); setRegenJsonName(null) }}
                          className="px-3 py-2 rounded-lg btn-ghost"
                          disabled={regenerating}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {regenJsonError && (
                      <p className="mt-2 text-xs text-red-300">{regenJsonError}</p>
                    )}
                    {regenJson && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-white/60">Preview JSON</summary>
                        <pre className="mt-2 p-2 bg-black/20 rounded text-white/70 overflow-x-auto text-xs max-h-40">{JSON.stringify(regenJson, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-white/80">Focus Areas (optional)</label>
                    <span className="text-xs text-white/50">Highlight sections to prioritize</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Executive Summary',
                      'Current State Analysis',
                      'Recommended Solution',
                      'Learner Experience Design',
                      'Measurement Framework',
                      'Resource Planning',
                      'Risk Assessment',
                      'Next Steps'
                    ].map((area) => {
                      const selected = focusAreas.includes(area)
                      return (
                        <button
                          key={area}
                          type="button"
                          className={`px-3 py-1.5 rounded-full border text-sm transition ${selected ? 'bg-secondary-500/20 text-white border-secondary-400/40' : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'}`}
                          onClick={() => setFocusAreas((prev) => selected ? prev.filter(a => a !== area) : [...prev, area])}
                          disabled={regenerating}
                        >
                          {area}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm text-white">Preserve original structure</p>
                      <p className="text-xs text-white/60">Maintain section order and headings</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preserveStructure}
                      onClick={() => setPreserveStructure(v => !v)}
                      disabled={regenerating}
                      className={`w-11 h-6 rounded-full transition relative ${preserveStructure ? 'bg-secondary-500/60' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${preserveStructure ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm text-white">Only update selected sections</p>
                      <p className="text-xs text-white/60">Limit changes to chosen focus areas</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={updateOnlySelected}
                      onClick={() => setUpdateOnlySelected(v => !v)}
                      disabled={regenerating}
                      className={`w-11 h-6 rounded-full transition relative ${updateOnlySelected ? 'bg-secondary-500/60' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${updateOnlySelected ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-2">
                <p className="hidden sm:block text-xs text-white/50">Recreation typically completes in under 2 minutes.</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRegenOpen(false)}
                    className="px-5 py-2 rounded-lg btn-ghost"
                    disabled={regenerating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!job || !id) return
                      try {
                        setRegenerating(true)
                        const result = await regenerateStarmapFinalReportWithContext(id, {
                          newContextText: regenText,
                          newContextJson: regenJson,
                          focusAreas,
                          preserveStructure,
                          updateOnlySelectedSections: updateOnlySelected
                        })
                        setJob({ ...job, final_report: result.content })
                        setRegenOpen(false)
                        setRegenText('')
                        setRegenJson(null)
                        setRegenJsonName(null)
                        setFocusAreas([])
                        setPreserveStructure(true)
                        setUpdateOnlySelected(false)
                      } catch (e) {
                        console.error('Regeneration failed:', e)
                        setError('Failed to recreate report. Please try again.')
                      } finally {
                        setRegenerating(false)
                      }
                    }}
                    className="px-6 py-2 rounded-lg btn-primary disabled:opacity-50"
                    disabled={regenerating || (!regenText && !regenJson)}
                  >
                    {regenerating ? 'Recreating…' : 'Recreate Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


