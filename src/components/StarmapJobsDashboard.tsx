import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getUserStarmapJobsPaginated,
  getStarmapJobStats,
  deleteStarmapJob,
  type StarmapJob
} from '@/services/starmapJobsService'
import EnhancedStarmapCard from '@/components/EnhancedStarmapCard'
// Counts on this dashboard are derived from starmap_jobs stats to avoid mismatch with legacy summaries
// (We keep realtime subscription and refresh on focus for accuracy.)
import { env } from '@/config/env'
import { getSupabase } from '@/services/supabase'

export default function StarmapJobsDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [jobs, setJobs] = useState<StarmapJob[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'failed'>('all')
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const PAGE_SIZE = 5
  const [totalCount, setTotalCount] = useState<number>(0)
  const [createdCount, setCreatedCount] = useState<number>(0)
  const [savedCount, setSavedCount] = useState<number>(0)
  const tierReqRef = useRef(0)
  
  useEffect(() => {
    loadJobs()
    loadStats()
    loadTierLimits()
  }, [filter, page, user, search])

  // Refresh saved/created counts on tab focus
  useEffect(() => {
    function onFocus() {
      void loadTierLimits()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Subscribe to real-time changes in jobs for accurate Created/Saved (completed) counts
  useEffect(() => {
    if (!user) return
    const supabase = getSupabase()
    const channel = supabase
      .channel('starmap_jobs_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'starmap_jobs', filter: `user_id=eq.${user.id}` },
        () => {
          void loadTierLimits()
        }
      )
      .subscribe()
    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }, [user])
  
  async function loadJobs() {
    try {
      setLoading(true)
      const status = filter === 'all' ? undefined : (filter as any)
      const { data, error, count } = await getUserStarmapJobsPaginated(page, PAGE_SIZE, status, search)
      if (!error && data) {
        setJobs(data)
        const safeCount = count || 0
        setTotalCount(safeCount)
        const totalPages = Math.max(1, Math.ceil(safeCount / PAGE_SIZE))
        if (page > totalPages) {
          setPage(totalPages)
        }
      }
    } catch (err) {
      console.error('Error loading jobs:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadStats() {
    const { data } = await getStarmapJobStats()
    if (data) {
      setStats(data)
    }
  }

  async function loadTierLimits() {
    try {
      const reqId = ++tierReqRef.current
      const { data: statsData } = await getStarmapJobStats()

      if (reqId !== tierReqRef.current) return

      if (statsData) {
        setCreatedCount(statsData.total)
        setSavedCount(statsData.completed)
      }
      if (env.isDev) {
        // eslint-disable-next-line no-console
        console.log('[TierLimits] created(total)=', statsData?.total, 'saved(completed)=', statsData?.completed)
      }
    } catch (err) {
      console.error('Error loading tier limits:', err)
    }
  }
  
  async function handleDelete(jobId: string) {
    if (!confirm('Are you sure you want to delete this starmap?')) return
    
    try {
      setDeleting(jobId)
      const { error } = await deleteStarmapJob(jobId)
      
      if (!error) {
        setJobs(jobs.filter(j => j.id !== jobId))
        loadStats()
        loadTierLimits()
      }
    } catch (err) {
      console.error('Error deleting job:', err)
    } finally {
      setDeleting(null)
    }
  }
  
  function handleResume(jobId: string) {
    navigate(`/discover?jobId=${jobId}`)
  }
  
  function handleView(jobId: string) {
    navigate(`/starmap/${jobId}`)
  }
  
  // replaced by StarmapJobCard visuals
  
  if (!user) {
    navigate('/auth')
    return null
  }
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white relative">
      
      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.completed}</div>
              <div className="text-white/70">Completed</div>
            </div>
            <div className="glass-card rounded-lg p-6">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{stats.inProgress}</div>
              <div className="text-white/70">In Progress</div>
            </div>
            <div className="glass-card rounded-lg p-6">
              <div className="text-3xl font-bold text-red-400 mb-2">{stats.failed}</div>
              <div className="text-white/70">Failed</div>
            </div>
            <div className="glass-card rounded-lg p-6">
              <div className="text-white/70 mb-2">Trial Tier</div>
              <div className="space-y-1 text-sm">
                <div className="text-white/80">
                  Created: <span className="font-semibold text-white">{createdCount}</span>
                </div>
                <div className="text-white/80">
                  Saved: <span className="font-semibold text-white">{savedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'completed', label: 'Completed' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'failed', label: 'Failed' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => { setPage(1); setFilter(t.key as any) }}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === t.key 
                    ? 'bg-primary-500/30 text-primary-300 border border-primary-400/50' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value) }}
              placeholder="Search by title..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
            />
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.385 3.385a1 1 0 01-1.414 1.414l-3.385-3.385zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Jobs List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
            <p className="text-white/70">Loading your starmaps...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <svg className="w-24 h-24 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No starmaps yet</h3>
            <p className="text-white/70 mb-6">Start your L&D journey by creating your first starmap</p>
            <button
              onClick={() => navigate('/discover')}
              className="btn-primary px-6 py-2"
            >
              Create Your First Starmap
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {jobs.map(job => (
                <EnhancedStarmapCard
                  key={job.id}
                  job={job}
                  onView={handleView}
                  onResume={handleResume}
                  onDelete={(id) => handleDelete(id)}
                  deleting={deleting === job.id}
                />
              ))}
            </div>
            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-1.5 mt-6">
                <button
                  type="button"
                  className="h-8 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  Prev
                </button>
                {Array.from({ length: Math.ceil(totalCount / PAGE_SIZE) }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`h-8 min-w-[32px] px-2 text-xs rounded-full transition-colors ${n === page ? 'bg-primary-400/20 text-white border border-primary-400/50' : 'bg-white/5 text-white/70 border border-white/10 hover:text-white'}`}
                    aria-current={n === page ? 'page' : undefined}
                    aria-label={`Page ${n}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="h-8 px-3 text-xs rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white disabled:opacity-40"
                  onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Create Button */}
      <button
        onClick={() => navigate('/discover')}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full bg-secondary-500 text-white shadow-lg shadow-secondary-500/30 hover:bg-secondary-400 focus:outline-none focus:ring-2 focus:ring-secondary-400/50 border border-white/10 flex items-center justify-center z-50"
        aria-label="Create New Starmap"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
