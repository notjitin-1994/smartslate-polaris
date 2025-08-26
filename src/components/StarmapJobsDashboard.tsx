import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getUserStarmapJobs,
  getStarmapJobStats,
  deleteStarmapJob,
  type StarmapJob
} from '@/services/starmapJobsService'

export default function StarmapJobsDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [jobs, setJobs] = useState<StarmapJob[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'draft' | 'processing' | 'completed' | 'failed'>('all')
  
  useEffect(() => {
    loadJobs()
    loadStats()
  }, [filter])
  
  async function loadJobs() {
    try {
      setLoading(true)
      const status = filter === 'all' ? undefined : filter
      const { data, error } = await getUserStarmapJobs(20, status as any)
      
      if (!error && data) {
        setJobs(data)
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
  
  async function handleDelete(jobId: string) {
    if (!confirm('Are you sure you want to delete this starmap?')) return
    
    try {
      setDeleting(jobId)
      const { error } = await deleteStarmapJob(jobId)
      
      if (!error) {
        setJobs(jobs.filter(j => j.id !== jobId))
        loadStats()
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
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/20'
      case 'processing':
      case 'queued':
        return 'text-yellow-400 bg-yellow-400/20 animate-pulse'
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/20'
      default:
        return 'text-blue-400 bg-blue-400/20'
    }
  }
  
  function getStatusLabel(status: string) {
    switch (status) {
      case 'queued':
        return 'Queued'
      case 'processing':
        return 'Processing'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'In Progress'
    }
  }
  
  if (!user) {
    navigate('/auth')
    return null
  }
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[rgb(var(--bg))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Your Starmaps</h1>
              <p className="text-white/70 mt-1">One place to track all your Starmaps</p>
            </div>
            <button
              onClick={() => navigate('/discover')}
              className="btn-primary px-6 py-3"
            >
              <span className="mr-2">+</span>
              Create New Starmap
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card rounded-lg p-6">
              <div className="text-3xl font-bold text-white mb-2">{stats.total}</div>
              <div className="text-white/70">Total Starmaps</div>
            </div>
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
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-2">
          {['all', 'draft', 'processing', 'completed', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === status 
                  ? 'bg-primary-500/30 text-primary-300 border border-primary-400/50' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="glass-card rounded-lg p-6 hover:bg-white/5 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">
                        {job.title || 'Untitled Starmap'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    
                    <div className="flex gap-6 text-sm text-white/60 mb-3">
                      <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(job.updated_at).toLocaleDateString()}</span>
                      {job.completed_at && (
                        <span>Completed: {new Date(job.completed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="flex gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${job.stage1_complete ? 'bg-green-400' : 'bg-white/20'}`} />
                      <div className={`w-2 h-2 rounded-full ${job.stage2_complete ? 'bg-green-400' : 'bg-white/20'}`} />
                      <div className={`w-2 h-2 rounded-full ${job.stage3_complete ? 'bg-green-400' : 'bg-white/20'}`} />
                      <div className={`w-2 h-2 rounded-full ${job.dynamic_complete ? 'bg-green-400' : 'bg-white/20'}`} />
                      <div className={`w-2 h-2 rounded-full ${job.final_report ? 'bg-green-400' : 'bg-white/20'}`} />
                    </div>
                    
                    {job.report_job_progress !== undefined && job.status === 'processing' && (
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-3">
                        <div 
                          className="bg-gradient-to-r from-primary-400 to-secondary-400 h-full transition-all duration-500"
                          style={{ width: `${job.report_job_progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {job.status === 'completed' && job.final_report ? (
                      <button
                        onClick={() => handleView(job.id)}
                        className="px-4 py-2 bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-all"
                      >
                        View Report
                      </button>
                    ) : job.status === 'draft' ? (
                      <button
                        onClick={() => handleResume(job.id)}
                        className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
                      >
                        Resume
                      </button>
                    ) : job.status === 'processing' ? (
                      <button
                        onClick={() => handleResume(job.id)}
                        className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-all"
                      >
                        Check Status
                      </button>
                    ) : null}
                    
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                      {deleting === job.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
