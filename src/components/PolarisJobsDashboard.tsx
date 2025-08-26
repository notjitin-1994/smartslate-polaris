import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getUserJobs, 
  deleteJob, 
  getJobStats,
  type PolarisJob,
  type PolarisJobStatus
} from '@/services/polarisJobsService'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface JobCardProps {
  job: PolarisJob
  onDelete: (jobId: string) => void
  onResume: (jobId: string) => void
  onView: (jobId: string) => void
}

function JobCard({ job, onDelete, onResume, onView }: JobCardProps) {
  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      greeting: 'Initial Information',
      organization: 'Organization Details',
      requirements: 'Project Requirements',
      preliminary: 'Preliminary Report',
      dynamic_questions: 'Dynamic Questionnaire',
      final_report: 'Final Report',
      completed: 'Completed'
    }
    return labels[stage] || stage
  }
  
  const getStatusColor = (status: PolarisJobStatus) => {
    const colors: Record<PolarisJobStatus, string> = {
      draft: 'text-white/70',
      processing: 'text-primary-500',
      paused: 'text-yellow-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
      cancelled: 'text-white/50'
    }
    return colors[status] || 'text-white/70'
  }
  
  const getProgressPercentage = () => {
    const stages = ['greeting', 'organization', 'requirements', 'preliminary', 'dynamic_questions', 'final_report']
    const currentIndex = stages.indexOf(job.current_stage)
    if (currentIndex === -1) return 100
    return Math.round(((currentIndex + 1) / stages.length) * 100)
  }
  
  return (
    <div className="glass-card p-6 hover:-translate-y-0.5 transition-transform">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            {job.title || job.company_name || 'Untitled Starmap'}
          </h3>
          <p className="text-sm text-white/60 mt-1">
            Created {formatDistanceToNow(new Date(job.created_at))} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium capitalize ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
          {job.edits_remaining > 0 && (
            <span className="text-xs px-2 py-1 rounded border border-white/10 bg-white/5 text-white/85">
              {job.edits_remaining} edits left
            </span>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span>{getStageLabel(job.current_stage)}</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all bar-smooth"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
      
      {/* Stages completed */}
      <div className="mb-4">
        <p className="text-sm text-white/70">
          Completed stages: {job.stages_completed.length} / 6
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {job.stages_completed.map(stage => (
            <span key={stage} className="text-xs px-2 py-1 rounded border border-green-500/30 bg-green-500/15 text-green-100">
              {getStageLabel(stage)}
            </span>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {job.status === 'paused' && (
          <button
            onClick={() => onResume(job.id)}
            className="flex-1 btn-primary text-sm"
          >
            Resume
          </button>
        )}
        {job.status === 'completed' ? (
          <button
            onClick={() => onView(job.id)}
            className="flex-1 btn-primary text-sm"
          >
            View Reports
          </button>
        ) : (job.status === 'draft' || job.status === 'processing') ? (
          <button
            onClick={() => onView(job.id)}
            className="flex-1 btn-primary text-sm"
          >
            Review and continue
          </button>
        ) : null}
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this starmap? This action cannot be undone.')) {
              onDelete(job.id)
            }
          }}
          className="px-4 py-2 border border-red-500/30 text-red-200 rounded-lg hover:bg-red-500/10 transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function PolarisJobsDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<PolarisJob[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    total: number
    completed: number
    inProgress: number
    paused: number
    averageEditsUsed: number
  } | null>(null)
  const [filterStatus, setFilterStatus] = useState<PolarisJobStatus | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadJobs()
    loadStats()
  }, [filterStatus])
  
  async function loadJobs() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await getUserJobs(
        50,
        filterStatus === 'all' ? undefined : filterStatus
      )
      
      if (error) {
        setError('Failed to load your starmaps')
        console.error('Error loading jobs:', error)
        return
      }
      
      setJobs(data)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error loading jobs:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadStats() {
    try {
      const { data } = await getJobStats()
      if (data) setStats(data)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }
  
  async function handleDelete(jobId: string) {
    try {
      const { error } = await deleteJob(jobId)
      if (error) {
        alert('Failed to delete starmap')
        return
      }
      
      // Reload jobs
      await loadJobs()
      await loadStats()
    } catch (err) {
      console.error('Error deleting job:', err)
      alert('Failed to delete starmap')
    }
  }
  
  function handleResume(jobId: string) {
    navigate(`/polaris/job/${jobId}/resume`)
  }
  
  function handleView(jobId: string) {
    navigate(`/polaris/job/${jobId}`)
  }
  
  function handleCreateNew() {
    navigate('/polaris/new')
  }
  
  if (!user) {
    navigate('/auth')
    return null
  }
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white heading-accent">Your Polaris Starmaps</h1>
          <p className="text-white/70 mt-2">
            Manage your L&D starmap generation jobs
          </p>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="glass-card p-4">
              <p className="text-sm text-white/70">Total Starmaps</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-white/70">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-white/70">In Progress</p>
              <p className="text-2xl font-bold text-primary-500">{stats.inProgress}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-white/70">Paused</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.paused}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-sm text-white/70">Avg Edits Used</p>
              <p className="text-2xl font-bold text-secondary-500">
                {stats.averageEditsUsed.toFixed(1)}
              </p>
            </div>
          </div>
        )}
        
        {/* Filters and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-secondary-500 text-white' 
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'draft'
                  ? 'bg-secondary-500 text-white'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'paused'
                  ? 'bg-secondary-500 text-white'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-secondary-500 text-white'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              Completed
            </button>
          </div>
          
          <button
            onClick={handleCreateNew}
            className="btn-primary px-6 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Starmap
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 border border-red-500/30 rounded-lg text-red-100 bg-red-500/15">
            {error}
          </div>
        )}
        
        {/* Jobs Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <svg className="w-16 h-16 mx-auto text-white/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">
              {filterStatus === 'all' ? 'No starmaps yet' : `No ${filterStatus} starmaps`}
            </h3>
            <p className="text-white/70 mb-6">
              Create your first Polaris starmap to get started
            </p>
            <button
              onClick={handleCreateNew}
              className="btn-primary px-6 py-3 font-medium"
            >
              Create Your First Starmap
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={handleDelete}
                onResume={handleResume}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
