import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { listUserStarmaps, createStarmapDraft, removeStarmap } from '@/services'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type StatCard = {
  id: string
  label: string
  value: number | string
  delta?: string
  tone?: 'default' | 'success' | 'warning' | 'info'
}

function IconSparkle({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l2.2 4.5L19 9.8l-4.3 2.3L12 17l-2.7-4.9L5 9.8l4.8-2.3L12 3z" />
    </svg>
  )
}

function IconPulse({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-7 4 14 2-7h4" />
    </svg>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg ${className}`}>
      {children}
    </div>
  )
}

function Stat({ label, value, delta, tone = 'default', icon }: { label: string; value: string | number; delta?: string; tone?: StatCard['tone']; icon?: React.ReactNode }) {
  const toneClass = tone === 'success' ? 'text-green-300' : tone === 'warning' ? 'text-amber-300' : tone === 'info' ? 'text-primary-300' : 'text-white/70'
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-white/60">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-white/95">{value}</div>
          {delta && <div className={`mt-1 text-[11px] ${toneClass}`}>{delta}</div>}
        </div>
        {icon && (
          <div className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white/85">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

 

type Job = {
  id: string
  title: string | null
  created_at: string
  status: 'draft' | 'in_progress' | 'generating_static_questions' | 'awaiting_static_answers' | 'generating_dynamic_questions' | 'awaiting_dynamic_answers' | 'generating_report' | 'review' | 'completed' | 'failed' | 'cancelled' | 'archived'
  progress_percentage: number | null
}

export function HomeDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ total: number; in_progress: number; completed: number; failed?: number } | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [page, setPage] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'failed'>('all')
  const PAGE_SIZE = 5
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activityData, setActivityData] = useState<Array<{ day: string; created: number }>>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    jobId: string | null
    jobTitle: string
  }>({
    isOpen: false,
    jobId: null,
    jobTitle: ''
  })

  useEffect(() => {
    let cancel = false
    async function load() {
      try {
        setLoading(true)
        const rows = await listUserStarmaps()
        if (cancel) return
        let filtered = rows
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase()
          const titleOf = (r: any) => (r?.title || r?.session_title || r?.name || '') as string
          filtered = filtered.filter(r => titleOf(r).toLowerCase().includes(q))
        }
        if (filter !== 'all') {
          filtered = filtered.filter(r => r.status === (filter as any))
        }
        setTotalCount(filtered.length)
        const pageStart = (page - 1) * PAGE_SIZE
        const pageItems = showAll ? filtered : filtered.slice(pageStart, pageStart + PAGE_SIZE)
        setJobs(pageItems.map(r => ({
          id: (r as any).id,
          title: (r as any).title ?? (r as any).session_title ?? (r as any).name ?? null,
          created_at: (r as any).created_at ?? new Date().toISOString(),
          status: ((r as any).status ?? 'in_progress') as Job['status'],
          progress_percentage: (r as any).progress_percentage ?? null
        })))
        const statsData = {
          total: rows.length,
          in_progress: rows.filter(r => r.status === 'in_progress' || r.status === 'draft').length,
          completed: rows.filter(r => r.status === 'completed').length,
          failed: rows.filter(r => r.status === 'failed').length,
        }
        setStats(statsData)
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [page, filter, debouncedSearch, showAll])

  // Build lightweight 7-day activity series for the chart
  useEffect(() => {
    let cancel = false
    async function buildActivity() {
      const now = new Date()
      const days: Array<{ day: string; created: number }> = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const label = d.toLocaleDateString(undefined, { weekday: 'short' })
        days.push({ day: label, created: 0 })
      }
      if (!cancel) setActivityData(days)
    }
    buildActivity()
    return () => { cancel = true }
  }, [filter, debouncedSearch])

  const statCards: StatCard[] = useMemo(() => ([
    { id: 'total', label: 'Total Starmaps', value: stats?.total ?? '—', delta: '+0 this week', tone: 'info' },
    { id: 'inprogress', label: 'In Progress', value: stats?.in_progress ?? '—', delta: 'On track', tone: 'success' },
    { id: 'completed', label: 'Completed', value: stats?.completed ?? '—', delta: '—', tone: 'default' },
    { id: 'failed', label: 'Failed', value: stats?.failed ?? '—', delta: '—', tone: 'warning' },
  ]), [stats])

  function computeProgress(job: Job): number {
    const val = typeof job.progress_percentage === 'number' ? job.progress_percentage : 0
    return Math.max(0, Math.min(100, val))
  }

  function getStatusLabel(status: Job['status']): { text: string; cls: string } {
    switch (status) {
      case 'completed':
        return { text: 'Completed', cls: 'text-green-300 bg-green-400/10 border-green-400/30' }
      case 'failed':
        return { text: 'Failed', cls: 'text-red-300 bg-red-400/10 border-red-400/30' }
      case 'generating_static_questions':
      case 'awaiting_static_answers':
      case 'generating_dynamic_questions':
      case 'awaiting_dynamic_answers':
      case 'generating_report':
      case 'review':
        return { text: 'In Progress', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/30' }
      default:
        return { text: 'In Progress', cls: 'text-blue-300 bg-blue-400/10 border-blue-400/30' }
    }
  }

  function handleDelete(jobId: string) {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    
    setDeleteModal({
      isOpen: true,
      jobId,
      jobTitle: job.title || 'Untitled Starmap'
    })
  }

  async function confirmDelete() {
    const { jobId } = deleteModal
    if (!jobId) return
    setDeleting(jobId)
    try {
      await removeStarmap(jobId)
      setJobs(prev => prev.filter(j => j.id !== jobId))
      setDeleteModal({ isOpen: false, jobId: null, jobTitle: '' })
    } finally {
      setDeleting(null)
    }
  }

  function closeDeleteModal() {
    if (deleting) return // Prevent closing while deleting
    setDeleteModal({ isOpen: false, jobId: null, jobTitle: '' })
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Search + Primary Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5">
          <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value) }}
            placeholder="Search starmaps by title…"
            className="w-full bg-transparent outline-none text-sm text-white/90 placeholder-white/40"
            aria-label="Search starmaps"
          />
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              const draft = await createStarmapDraft()
              // Land on static form first (no loading=1 on brand-new draft)
              navigate(`/begin-discovery?starmapId=${draft.id}`)
            } catch (err: any) {
              console.error('Failed to create starmap:', err)
              alert('Unable to create starmap. Please ensure the database migration has been applied and you are signed in.')
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-primary-500/20 text-primary-200 hover:bg-primary-500/30 transition pressable"
        >
          <IconSparkle className="w-4 h-4" />
          <span className="text-sm font-medium">New Starmap</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-3 w-24 bg-white/10 rounded" />
              <div className="mt-3 h-6 w-20 bg-white/10 rounded" />
              <div className="mt-2 h-3 w-32 bg-white/10 rounded" />
            </Card>
          ))
        ) : (
          statCards.map((s) => (
            <Stat key={s.id} label={s.label} value={s.value} delta={s.delta} tone={s.tone} icon={<IconPulse className="h-5 w-5" />} />
          ))
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Activity / Trend */}
        <Card className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-white/95 font-semibold">Activity</h3>
              <p className="text-xs text-white/60">7-day creation trend</p>
            </div>
          </div>
          <div className="mt-3 h-40">
            {activityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/50 text-sm">No activity</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7bc5c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7bc5c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ background: 'rgba(13,27,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
                  <Area type="monotone" dataKey="created" stroke="#7bc5c7" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Quick Actions / Shortcuts */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5">
            <h3 className="text-white/95 font-semibold">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const draft = await createStarmapDraft()
                    navigate(`/begin-discovery?starmapId=${draft.id}`)
                  } catch (err: any) {
                    console.error('Failed to create starmap:', err)
                    alert('Unable to create starmap. Please ensure the database migration has been applied and you are signed in.')
                  }
                }}
                className="group w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left pressable"
                aria-label="Create Starmap"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/10 bg-primary-500/15 text-primary-300">
                  <IconSparkle className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-medium text-white/90">Create Starmap</div>
                <div className="text-xs text-white/60">Start a new discovery</div>
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="group w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left pressable"
                aria-label="Settings"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-white/80">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </div>
                <div className="mt-3 text-sm font-medium text-white/90">Settings</div>
                <div className="text-xs text-white/60">Manage preferences</div>
              </button>
            </div>
          </Card>

          {/* Filter Chips */}
          <Card className="p-5">
            <h3 className="text-white/95 font-semibold">Filters</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All', count: stats?.total ?? 0 },
                { key: 'in_progress', label: 'In Progress', count: stats?.in_progress ?? 0 },
                { key: 'completed', label: 'Completed', count: stats?.completed ?? 0 },
                { key: 'failed', label: 'Failed', count: stats?.failed ?? 0 },
              ] as const).map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setPage(1); setFilter(t.key as any) }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                    filter === t.key
                      ? 'bg-primary-500/20 text-primary-200 border-primary-400/40'
                      : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full border text-[10px] ${
                    filter === t.key ? 'border-primary-400/50 text-primary-200' : 'border-white/15 text-white/70'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Starmaps Table */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="text-white/95 font-semibold">Your Starmaps</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition"
            >
              {showAll ? 'Collapse' : 'View All'}
            </button>
            {showAll && (
              <span className="text-xs text-white/60">Showing {jobs.length} of {totalCount}</span>
            )}
            {showAll && (
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-200 hover:bg-red-500/20 transition"
                onClick={async () => {
                  const ids = jobs.filter(j => selectedIds.has(j.id)).map(j => j.id)
                  if (ids.length === 0) return
                  if (!confirm(`Delete ${ids.length} selected?`)) return
                  for (const id of ids) {
                    try { await removeStarmap(id) } catch {}
                  }
                  const del = new Set(ids)
                  setJobs(prev => prev.filter(j => !del.has(j.id)))
                  setSelectedIds(new Set())
                }}
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>
        <Card>
          {loading ? (
            <div className="p-6 grid grid-cols-1 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-md border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-10 text-center text-white/60">No {filter === 'all' ? '' : filter.replace('_', ' ') + ' '}starmaps</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/60">
                    <th className="px-4 py-3 font-medium">
                      <label className="inline-flex items-center gap-2 text-white/80">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-white/20 bg-transparent text-primary-400 focus:ring-primary-400/30"
                          onChange={(e) => {
                            const checked = e.currentTarget.checked
                            setSelectedIds(() => {
                              const ids = new Set<string>()
                              if (checked) jobs.forEach(j => ids.add(j.id))
                              return ids
                            })
                          }}
                          checked={jobs.length > 0 && jobs.every(j => selectedIds.has(j.id))}
                          aria-label="Select all"
                        />
                        <span>Title</span>
                      </label>
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const st = getStatusLabel(job.status)
                    const progress = computeProgress(job)
                    return (
                      <tr key={job.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3 text-white/90 max-w-[360px]">
                          <input type="checkbox" className="mr-2 h-4 w-4 rounded border-white/20 bg-transparent text-primary-400 focus:ring-primary-400/30 align-middle" onChange={(e) => {
                            const isChecked = (e.currentTarget as HTMLInputElement).checked
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (isChecked) next.add(job.id)
                              else next.delete(job.id)
                              return next
                            })
                          }} checked={selectedIds.has(job.id)} />
                          <div className="truncate">{job.title || 'Untitled Starmap'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border ${st.cls}`}>{st.text}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-2 bg-gradient-to-r from-primary-400 to-primary-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-white/70 w-10 text-right">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70 min-w-[120px]">{new Date(job.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const shouldShowLoading = job.status === 'submitted' || job.status === 'generating_dynamic_questions'
                                const url = shouldShowLoading 
                                  ? `/begin-discovery?starmapId=${job.id}&loading=1` 
                                  : `/begin-discovery?starmapId=${job.id}`
                                navigate(url)
                              }}
                              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition"
                            >
                              {job.status === 'draft' ? 'Resume' : 'Status'}
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              disabled={deleting === job.id}
                              className="px-2 py-1 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition disabled:opacity-50"
                              title="Delete"
                              aria-label="Delete starmap"
                            >
                              {deleting === job.id ? (
                                <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m4 4v6m4-6v6" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {/* Pagination / bulk controls */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {showAll && (
            <button
              type="button"
              className="h-8 px-3 text-xs rounded-full border border-white/10 bg-red-500/20 text-red-200 hover:bg-red-500/30"
              onClick={async () => {
                const ids = jobs.filter(j => (selectedIds as any)?.has?.(j.id)).map(j => j.id)
                if (ids.length === 0) return
                if (!confirm(`Delete ${ids.length} selected?`)) return
                for (const id of ids) {
                  try { await removeStarmap(id) } catch {}
                }
                const del = new Set(ids)
                setJobs(prev => prev.filter(j => !del.has(j.id)))
                ;(setSelectedIds as any)?.(new Set())
              }}
            >
              Delete Selected
            </button>
          )}
          <button
            type="button"
            className="h-8 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-xs text-white/60">Page {page} of {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}</span>
          <button
            type="button"
            className="h-8 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Starmap"
        message={`Are you sure you want to delete "${deleteModal.jobTitle}"? This action cannot be undone and all associated data will be permanently removed.`}
        confirmText="Delete Starmap"
        isDeleting={deleting === deleteModal.jobId}
      />
    </div>
  )
}

export default HomeDashboard


