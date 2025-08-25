import { useState, useEffect } from 'react'
import { getUserReportJobs, getJobStatistics, cancelReportJob, type ReportJob } from '@/services/reportJobsService'
// Simple time formatting utility
function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''}`
}

export function ReportJobsMonitor() {
  const [jobs, setJobs] = useState<ReportJob[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadJobs()
    loadStats()

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadJobs()
        loadStats()
      }, 5000) // Refresh every 5 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  async function loadJobs() {
    const { data, error } = await getUserReportJobs(undefined, 20)
    if (!error) {
      setJobs(data)
    }
    setLoading(false)
  }

  async function loadStats() {
    const { data, error } = await getJobStatistics()
    if (!error) {
      setStats(data)
    }
  }

  async function handleCancel(jobId: string) {
    const { error } = await cancelReportJob(jobId)
    if (!error) {
      loadJobs()
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'queued':
        return '⏳'
      case 'running':
        return '🔄'
      case 'succeeded':
        return '✅'
      case 'failed':
        return '❌'
      case 'cancelled':
        return '🚫'
      default:
        return '❓'
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'queued':
        return 'text-yellow-400'
      case 'running':
        return 'text-blue-400'
      case 'succeeded':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'cancelled':
        return 'text-gray-400'
      default:
        return 'text-white/60'
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Job Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-white/60">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.queued}</div>
              <div className="text-xs text-white/60">Queued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.running}</div>
              <div className="text-xs text-white/60">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.succeeded}</div>
              <div className="text-xs text-white/60">Succeeded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-white/60">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '-'}
              </div>
              <div className="text-xs text-white/60">Avg Duration</div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Report Jobs</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white/60">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-white/20"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadJobs}
              className="btn-ghost btn-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="text-white/60 text-center py-8">No report jobs yet</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.job_id}
                className="bg-white/5 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(job.status)}</span>
                      <span className={`font-medium ${getStatusColor(job.status)}`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                      {job.model && (
                        <span className="text-xs text-white/40">
                          ({job.model})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      ID: {job.job_id}
                    </div>
                    {job.created_at && (
                      <div className="text-xs text-white/40 mt-1">
                        Created {formatDistanceToNow(new Date(job.created_at))} ago
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {job.status === 'running' && job.percent !== undefined && (
                      <div className="text-right">
                        <div className="text-sm text-white/80">{job.percent}%</div>
                        {job.eta_seconds && job.eta_seconds > 0 && (
                          <div className="text-xs text-white/40">~{job.eta_seconds}s</div>
                        )}
                      </div>
                    )}
                    
                    {(job.status === 'queued' || job.status === 'running') && (
                      <button
                        onClick={() => handleCancel(job.job_id)}
                        className="btn-ghost btn-sm text-red-400"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {job.status === 'running' && job.percent !== undefined && (
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all duration-500"
                      style={{ width: `${job.percent}%` }}
                    />
                  </div>
                )}

                {job.error && (
                  <div className="text-xs text-red-300/80 bg-red-500/10 rounded p-2">
                    Error: {job.error}
                  </div>
                )}

                {job.result && job.status === 'succeeded' && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-white/60 hover:text-white">
                      View result preview
                    </summary>
                    <pre className="mt-2 p-2 bg-black/20 rounded text-white/70 overflow-x-auto">
                      {job.result.substring(0, 200)}...
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to check if there are any active jobs
 */
export function useActiveJobs() {
  const [hasActiveJobs, setHasActiveJobs] = useState(false)
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    async function checkActiveJobs() {
      const { data } = await getUserReportJobs(undefined, 10)
      const active = data.filter(j => j.status === 'queued' || j.status === 'running')
      setHasActiveJobs(active.length > 0)
      setActiveCount(active.length)
    }

    checkActiveJobs()
    const interval = setInterval(checkActiveJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  return { hasActiveJobs, activeCount }
}
