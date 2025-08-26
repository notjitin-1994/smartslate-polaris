import { useState, useEffect, type JSX } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  getJob,
  getJobReports,
  getJobEdits,
  getJobActivity,
  editJobReport,
  getJobReportContent,
  isReportEdited,
  type PolarisJob,
  type JobReport,
  type JobEdit,
  type JobActivity,
  type ReportType
} from '@/services/polarisJobsService'
import { markdownToHtml, htmlToMarkdown } from '@/lib/textUtils'
import ReportDisplay from '@/polaris/needs-analysis/ReportDisplay'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import { useAuth } from '@/contexts/AuthContext'
import { RichTextEditor } from '@/components/RichTextEditor'
import { updateJobTitle } from '@/services/polarisJobsService'

interface ReportTab {
  id: ReportType
  label: string
  description: string
  icon: string
}

const REPORT_TABS: ReportTab[] = [
  { 
    id: 'greeting', 
    label: 'Greeting Report', 
    description: 'Initial contact and context information',
    icon: '👋'
  },
  { 
    id: 'org', 
    label: 'Organization Report', 
    description: 'Company and organizational analysis',
    icon: '🏢'
  },
  { 
    id: 'requirement', 
    label: 'Requirements Report', 
    description: 'Project requirements and constraints',
    icon: '📋'
  },
  { 
    id: 'preliminary', 
    label: 'Preliminary Report', 
    description: 'Initial analysis and recommendations',
    icon: '📊'
  },
  { 
    id: 'dynamic_questionnaire', 
    label: 'Dynamic Questionnaire', 
    description: 'Adaptive questions and answers',
    icon: '❓'
  },
  { 
    id: 'final', 
    label: 'Final Report', 
    description: 'Complete L&D starmap report',
    icon: '🎯'
  }
]

const STAGE_ICONS = {
  greeting: '👋',
  organization: '🏢',
  requirements: '📋',
  preliminary: '📊',
  dynamic_questions: '❓',
  final_report: '🎯',
  completed: '✅'
}

export default function PolarisJobViewer() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [job, setJob] = useState<PolarisJob | null>(null)
  const [reports, setReports] = useState<JobReport[]>([])
  const [edits, setEdits] = useState<JobEdit[]>([])
  const [activity, setActivity] = useState<JobActivity[]>([])
  const [activeTab, setActiveTab] = useState<ReportType>('final')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'report']))
  
  // Editing state
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Title edit state
  const [editTitleMode, setEditTitleMode] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  
  useEffect(() => {
    if (!jobId) {
      navigate('/polaris/jobs')
      return
    }
    loadJobData()
  }, [jobId])
  
  async function loadJobData() {
    try {
      setLoading(true)
      setError(null)
      
      const [jobResult, reportsResult, editsResult, activityResult] = await Promise.all([
        getJob(jobId!),
        getJobReports(jobId!),
        getJobEdits(jobId!),
        getJobActivity(jobId!)
      ])
      
      if (jobResult.error || !jobResult.data) {
        setError('Failed to load job data')
        return
      }
      
      setJob(jobResult.data as PolarisJob)
      setTitleInput((jobResult.data as PolarisJob).title || (jobResult.data as PolarisJob).company_name || 'L&D Starmap Report')
      setReports(reportsResult.data)
      setEdits(editsResult.data)
      setActivity(activityResult.data)
      
      // Set initial active tab to first available report or final if it exists
      const hasContent = (tab: ReportType) => !!getJobReportContent(jobResult.data as PolarisJob, tab)
      if (hasContent('final')) {
        setActiveTab('final')
      } else {
        const availableReports = REPORT_TABS.filter(tab => hasContent(tab.id))
        if (availableReports.length > 0) {
          setActiveTab(availableReports[0].id)
        }
      }
    } catch (err) {
      console.error('Error loading job data:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  function getActiveContent(): string {
    if (!job) return ''
    const raw = getJobReportContent(job, activeTab) || ''
    const asMd = convertNaJsonStringToMarkdown(raw)
    return asMd || raw
  }
  
  function canEdit(): boolean {
    if (!job) return false
    return job.edits_remaining > 0 && getActiveContent() !== ''
  }
  
  function startEdit() {
    setEditContent(markdownToHtml(getActiveContent()))
    setEditMode(true)
  }
  
  function cancelEdit() {
    setEditMode(false)
    setEditContent('')
  }
  
  async function saveEdit() {
    if (!job) return
    const originalContent = getActiveContent()
    const editedMarkdown = htmlToMarkdown(editContent)
    try {
      setSaving(true)
      const { error } = await editJobReport(
        job.id,
        activeTab,
        editedMarkdown,
        originalContent,
        false
      )
      if (error) {
        alert(`Failed to save edit: ${error.message || 'Unknown error'}`)
        return
      }
      await loadJobData()
      setEditMode(false)
      setEditContent('')
    } catch (e) {
      console.error('Error saving edit:', e)
      alert('Failed to save edit')
    } finally {
      setSaving(false)
    }
  }

  async function saveTitle() {
    if (!job) return
    const nextTitle = titleInput.trim()
    if (!nextTitle) {
      setTitleInput(job.title || job.company_name || 'L&D Starmap Report')
      setEditTitleMode(false)
      return
    }
    const { error } = await updateJobTitle(job.id, nextTitle)
    if (!error) setJob({ ...job, title: nextTitle })
    setEditTitleMode(false)
  }
  
  function getEditHistory(reportType: ReportType): JobEdit[] {
    return edits.filter(e => e.report_type === reportType)
  }
  
  function getReportVersions(reportType: ReportType): JobReport[] {
    return reports.filter(r => r.report_type === reportType)
      .sort((a, b) => b.version - a.version)
  }
  
  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }
  
  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  function formatJsonData(data: any): JSX.Element {
    if (!data || Object.keys(data).length === 0) {
      return <span className="text-white/40 italic">No data collected</span>
    }
    
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-white/60 text-xs uppercase tracking-wider">
              {key.replace(/_/g, ' ')}
            </span>
            <span className="text-white/90">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  
  if (!user) {
    navigate('/auth')
    return null
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-400/20 border-t-primary-400"></div>
      </div>
    )
  }
  
  if (error || !job) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-200 mb-4">{error || 'Job not found'}</p>
          <button
            onClick={() => navigate('/polaris/jobs')}
            className="text-primary-500 hover:underline"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      
      {/* Header */}
      <div className="relative border-b border-white/10 bg-[rgb(var(--bg))]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/polaris/jobs')}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                {editTitleMode ? (
                  <input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle()
                      if (e.key === 'Escape') { setEditTitleMode(false); setTitleInput(job.title || job.company_name || 'L&D Starmap Report') }
                    }}
                    onBlur={saveTitle}
                    className="text-3xl font-bold bg-transparent border-b border-white/20 focus:border-primary-400 outline-none text-white"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-white">
                    {job.title || job.company_name || 'L&D Starmap Report'}
                  </h1>
                )}
                {!editTitleMode && (
                  <button
                    onClick={() => setEditTitleMode(true)}
                    aria-label="Edit title"
                    title="Edit title"
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-white/60">
                  ID: {job.id.slice(0, 8)}...
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  job.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                  job.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                  job.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {job.status.toUpperCase()}
                </span>
                {job.legacy_summary_id && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                    IMPORTED
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {job.edits_remaining}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  Edits Left
                </div>
              </div>
              {(job.status === 'draft' || job.status === 'processing') && (
                <button
                  onClick={() => navigate(`/polaris/job/${job.id}/resume`)}
                  className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 font-medium transition-all transform hover:scale-105"
                >
                  Continue Generation
                </button>
              )}
              {job.status === 'completed' && (
                <button
                  onClick={() => navigate(`/polaris/job/${job.id}/export`)}
                  className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 font-medium transition-all transform hover:scale-105"
                >
                  Export All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid grid-cols-1 ${sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-8`}>
          {/* Left Sidebar - Metadata & Activity */}
          <div className={`space-y-6 transition-all ${sidebarCollapsed ? 'hidden lg:hidden' : 'lg:col-span-1'}`}>
            {/* Sidebar Toggle */}
            <div className="flex justify-end">
              <button
                onClick={() => setSidebarCollapsed(s => !s)}
                aria-label="Toggle sidebar"
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
            
            {/* Job Overview Card */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => toggleSection('overview')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">📊</span> Job Overview
                </h3>
                <svg className={`w-5 h-5 transition-transform ${expandedSections.has('overview') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.has('overview') && (
                <div className="px-6 pb-6 space-y-4 border-t border-white/10">
                  {job.company_name && (
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Company</p>
                      <p className="text-white/90 font-medium">{job.company_name}</p>
                    </div>
                  )}
                  {job.experience_level && (
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Experience Level</p>
                      <p className="text-white/90">{job.experience_level}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Current Stage</p>
                    <p className="text-white/90 flex items-center gap-2">
                      <span className="text-lg">{STAGE_ICONS[job.current_stage as keyof typeof STAGE_ICONS]}</span>
                      {job.current_stage.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Progress</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.keys(STAGE_ICONS).slice(0, -1).map(stage => (
                        <span
                          key={stage}
                          className={`px-2 py-1 rounded text-xs ${
                            job.stages_completed.includes(stage)
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-white/5 text-white/40'
                          }`}
                        >
                          {STAGE_ICONS[stage as keyof typeof STAGE_ICONS]} {stage.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-white/90 text-sm">{formatDate(job.created_at)}</p>
                  </div>
                  {job.completed_at && (
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Completed</p>
                      <p className="text-white/90 text-sm">{formatDate(job.completed_at)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Last Activity</p>
                    <p className="text-white/90 text-sm">{formatDate(job.last_activity_at)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Research Status */}
            {(job.greeting_research_status || job.org_research_status || job.requirement_research_status) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => toggleSection('research')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">🔬</span> Research Status
                  </h3>
                  <svg className={`w-5 h-5 transition-transform ${expandedSections.has('research') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.has('research') && (
                  <div className="px-6 pb-6 space-y-3 border-t border-white/10">
                    {job.greeting_research_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Greeting Research</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          job.greeting_research_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          job.greeting_research_status === 'running' ? 'bg-yellow-500/20 text-yellow-300' :
                          job.greeting_research_status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {job.greeting_research_status}
                        </span>
                      </div>
                    )}
                    {job.org_research_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Organization Research</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          job.org_research_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          job.org_research_status === 'running' ? 'bg-yellow-500/20 text-yellow-300' :
                          job.org_research_status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {job.org_research_status}
                        </span>
                      </div>
                    )}
                    {job.requirement_research_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Requirements Research</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          job.requirement_research_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          job.requirement_research_status === 'running' ? 'bg-yellow-500/20 text-yellow-300' :
                          job.requirement_research_status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {job.requirement_research_status}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Collected Data */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => toggleSection('data')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">💾</span> Collected Data
                </h3>
                <svg className={`w-5 h-5 transition-transform ${expandedSections.has('data') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.has('data') && (
                <div className="px-6 pb-6 space-y-4 border-t border-white/10 max-h-96 overflow-y-auto">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Greeting Data</p>
                    {formatJsonData(job.greeting_data)}
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Organization Data</p>
                    {formatJsonData(job.org_data)}
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Requirements Data</p>
                    {formatJsonData(job.requirements_data)}
                  </div>
                  {job.dynamic_answers && Object.keys(job.dynamic_answers).length > 0 && (
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Dynamic Answers</p>
                      {formatJsonData(job.dynamic_answers)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Activity Timeline */}
            {activity.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => toggleSection('activity')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">⏱️</span> Activity Timeline
                  </h3>
                  <svg className={`w-5 h-5 transition-transform ${expandedSections.has('activity') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.has('activity') && (
                  <div className="px-6 pb-6 border-t border-white/10 max-h-96 overflow-y-auto">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10"></div>
                      {activity.map((item, index) => (
                        <div key={item.id} className="relative flex items-start gap-4 py-3">
                          <div className="relative z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                            {activity.length - index}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white/90 font-medium">
                              {item.action.replace(/_/g, ' ')}
                            </p>
                            {item.stage && (
                              <p className="text-xs text-white/60">
                                Stage: {item.stage.replace(/_/g, ' ')}
                              </p>
                            )}
                            <p className="text-xs text-white/40 mt-1">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Main Content Area */}
          <div className={`${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6 transition-all`}>
            {sidebarCollapsed && (
              <div className="flex justify-start">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Show sidebar"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Report Tabs */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex overflow-x-auto border-b border-white/10">
                {REPORT_TABS.map(tab => {
                  const hasContent = job ? getJobReportContent(job, tab.id) : ''
                  const edited = job ? isReportEdited(job, tab.id) : false
                  const editCount = getEditHistory(tab.id).length
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      disabled={!hasContent}
                      className={`
                        px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-all
                        ${activeTab === tab.id
                          ? 'border-white/40 text-white bg-white/5'
                          : hasContent
                            ? 'border-transparent text-white/80 hover:text-white hover:border-white/20 hover:bg-white/5'
                            : 'border-transparent text-white/30 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.label}</span>
                      {edited && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-medium">
                          EDITED
                        </span>
                      )}
                      {editCount > 0 && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                          {editCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              
              {/* Report Content */}
              <div className="relative">
                {/* Info button */}
                <button
                  onClick={() => setInfoOpen(true)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white/85 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="10" x2="12" y2="16" />
                    <circle cx="12" cy="7" r="1" />
                  </svg>
                </button>
                
                {/* Edit Controls */}
                {!editMode && canEdit() && (
                  <div className="p-6 border-b border-white/10">
                    <button
                      onClick={startEdit}
                      className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 font-medium transition-all transform hover:scale-105"
                    >
                      ✏️ Edit This Report
                    </button>
                  </div>
                )}
                
                {/* View or Edit Mode */}
                <div className="p-8">
                  {editMode ? (
                    <div className="space-y-4">
                      <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Edit the report content..."
                        autoGrow
                        maxHeight={520}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-5 py-2 rounded-lg btn-ghost"
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="px-6 py-2 rounded-lg btn-primary disabled:opacity-50"
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{REPORT_TABS.find(t => t.id === activeTab)?.icon}</span>
                          <h2 className="text-2xl font-bold text-white">
                            {REPORT_TABS.find(t => t.id === activeTab)?.label}
                          </h2>
                        </div>
                        <p className="text-white/60 text-sm">
                          {REPORT_TABS.find(t => t.id === activeTab)?.description}
                        </p>
                        {job && isReportEdited(job, activeTab) && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            This report has been edited
                          </div>
                        )}
                      </div>
                      <ReportDisplay 
                        reportMarkdown={getActiveContent()} 
                        reportTitle={job.title || undefined} 
                        editableTitle={false}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Edit History */}
            {getEditHistory(activeTab).length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-xl">📝</span> Edit History
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {getEditHistory(activeTab).map(edit => (
                      <div key={edit.id} className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                          #{edit.edit_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white">
                              Edit #{edit.edit_number}
                            </p>
                            {edit.ai_assisted && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                                🤖 AI Assisted
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/60">
                            {formatDate(edit.created_at)}
                          </p>
                          {edit.ai_prompt && (
                            <div className="mt-2 p-2 rounded bg-white/5">
                              <p className="text-xs text-white/60">AI Prompt:</p>
                              <p className="text-xs text-white/80">{edit.ai_prompt}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Report Versions */}
            {getReportVersions(activeTab).length > 1 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-xl">📚</span> Version History
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {getReportVersions(activeTab).map(version => (
                      <div key={version.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Version {version.version}
                            {version.is_current && (
                              <span className="ml-2 px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">
                                CURRENT
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-white/60">
                            {version.generated_by === 'ai' ? '🤖 AI Generated' : '✏️ User Edited'}
                            {' • '}
                            {formatDate(version.created_at)}
                          </p>
                        </div>
                        <button className="text-xs text-primary-400 hover:text-primary-300">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Info Modal */}
      {infoOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[rgb(var(--bg))]/70 backdrop-blur-sm" onClick={() => setInfoOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[rgb(var(--bg))] shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">Report Information</h3>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  ×
                </button>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Report Type</dt>
                    <dd className="text-sm font-medium text-white flex items-center gap-2">
                      <span>{REPORT_TABS.find(t => t.id === activeTab)?.icon}</span>
                      {REPORT_TABS.find(t => t.id === activeTab)?.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Status</dt>
                    <dd className="text-sm font-medium text-white">
                      {job && isReportEdited(job, activeTab) ? '✏️ Edited' : '📄 Original'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Versions</dt>
                    <dd className="text-sm font-medium text-white">
                      {getReportVersions(activeTab).length} version{getReportVersions(activeTab).length !== 1 ? 's' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Word Count</dt>
                    <dd className="text-sm font-medium text-white">
                      {getActiveContent().split(/\s+/).filter(w => w.length > 0).length.toLocaleString()} words
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Character Count</dt>
                    <dd className="text-sm font-medium text-white">
                      {getActiveContent().length.toLocaleString()} characters
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-white/60 mb-1">Job ID</dt>
                    <dd className="text-sm font-medium text-white font-mono">
                      {job.id}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                <button 
                  onClick={() => setInfoOpen(false)} 
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
