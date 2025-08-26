import { getSupabase } from '@/lib/supabaseClient'

const supabase = getSupabase()

// Types
export type PolarisJobStage = 
  | 'greeting'
  | 'organization' 
  | 'requirements'
  | 'preliminary'
  | 'dynamic_questions'
  | 'final_report'
  | 'completed'

export type PolarisJobStatus = 
  | 'draft'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ReportType = 
  | 'greeting'
  | 'org'
  | 'requirement'
  | 'preliminary'
  | 'dynamic_questionnaire'
  | 'final'

export interface PolarisJob {
  id: string
  user_id: string
  title?: string
  company_name?: string
  experience_level?: string
  current_stage: PolarisJobStage
  status: PolarisJobStatus
  
  // Edit tracking
  edits_remaining: number
  edits_used: number
  
  // Stage tracking
  stages_completed: string[]
  
  // Collected data
  greeting_data: Record<string, any>
  org_data: Record<string, any>
  requirements_data: Record<string, any>
  dynamic_questions: any[]
  dynamic_answers: Record<string, any>
  
  // Generated reports
  greeting_report?: string
  org_report?: string
  requirement_report?: string
  preliminary_report?: string
  dynamic_questionnaire_report?: string
  final_report?: string
  
  // Edited versions
  greeting_report_edited?: string
  org_report_edited?: string
  requirement_report_edited?: string
  preliminary_report_edited?: string
  dynamic_questionnaire_report_edited?: string
  final_report_edited?: string
  
  // Research status
  greeting_research_status?: 'pending' | 'running' | 'completed' | 'failed'
  org_research_status?: 'pending' | 'running' | 'completed' | 'failed'
  requirement_research_status?: 'pending' | 'running' | 'completed' | 'failed'
  
  // Session state
  session_state: Record<string, any>
  last_activity_at: string
  
  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Legacy
  legacy_summary_id?: string
}

export interface JobEdit {
  id: string
  job_id: string
  user_id: string
  report_type: ReportType
  original_content: string
  edited_content: string
  edit_number: number
  ai_assisted: boolean
  ai_prompt?: string
  ai_model?: string
  created_at: string
}

export interface JobReport {
  id: string
  job_id: string
  report_type: ReportType
  version: number
  is_current: boolean
  content: string
  metadata: Record<string, any>
  generated_by?: string
  model_used?: string
  prompt_used?: string
  created_at: string
}

export interface JobActivity {
  id: string
  job_id: string
  user_id: string
  action: string
  stage?: PolarisJobStage
  details: Record<string, any>
  created_at: string
}

/**
 * One-time backfill to surface legacy summaries as completed jobs.
 * This creates a `polaris_jobs` row per `polaris_summaries` the user owns
 * that doesn't already have a corresponding job (linked via legacy_summary_id).
 */
async function backfillLegacyJobsForUser(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Skip if we've already migrated in this browser session/profile
    const storageKey = `polaris:legacy_migrated:${user.id}`
    try {
      if (typeof window !== 'undefined') {
        const done = window.localStorage.getItem(storageKey)
        if (done === '1') return
      }
    } catch {}

    // Get summaries for this user
    const { data: summaries, error: summariesErr } = await supabase
      .from('polaris_summaries')
      .select('id, company_name, report_title, summary_content, prelim_report, dynamic_questionnaire_report, greeting_report, org_report, requirement_report, created_at')
      .eq('user_id', user.id)

    if (summariesErr || !summaries || summaries.length === 0) return

    // Find which summaries were already imported
    const { data: existingJobs } = await supabase
      .from('polaris_jobs')
      .select('legacy_summary_id')
      .eq('user_id', user.id)

    const imported = new Set<string>((existingJobs || []).map((j: any) => j.legacy_summary_id).filter(Boolean))

    // If the user already has any imported legacy jobs, mark as migrated to prevent re-import after deletions
    if (imported.size > 0) {
      try { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, '1') } catch {}
      return
    }

    const rowsToInsert = summaries
      .filter((s: any) => !imported.has(s.id))
      .map((s: any) => {
        const stagesCompleted: string[] = []
        if (s.greeting_report) stagesCompleted.push('greeting')
        if (s.org_report) stagesCompleted.push('organization')
        if (s.requirement_report) stagesCompleted.push('requirements')
        if (s.prelim_report) stagesCompleted.push('preliminary')
        if (s.dynamic_questionnaire_report) stagesCompleted.push('dynamic_questions')
        if (s.summary_content) stagesCompleted.push('final_report')

        return {
          user_id: user.id,
          title: s.report_title || s.company_name || 'Imported Starmap',
          company_name: s.company_name,
          experience_level: null,
          current_stage: 'completed',
          status: 'completed',
          edits_remaining: 3,
          edits_used: 0,
          stages_completed: stagesCompleted,
          greeting_data: {},
          org_data: {},
          requirements_data: {},
          dynamic_questions: [],
          dynamic_answers: {},
          greeting_report: s.greeting_report || null,
          org_report: s.org_report || null,
          requirement_report: s.requirement_report || null,
          preliminary_report: s.prelim_report || null,
          dynamic_questionnaire_report: s.dynamic_questionnaire_report || null,
          final_report: s.summary_content || null,
          session_state: {},
          last_activity_at: s.created_at || new Date().toISOString(),
          completed_at: s.created_at || new Date().toISOString(),
          legacy_summary_id: s.id,
        }
      })

    if (rowsToInsert.length === 0) {
      try { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, '1') } catch {}
      return
    }

    await supabase.from('polaris_jobs').insert(rowsToInsert)

    // Mark as migrated so we don't re-import again if user deletes some of them
    try { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, '1') } catch {}
  } catch (err) {
    // Non-fatal; silently skip if anything goes wrong to avoid breaking dashboard
    console.warn('Legacy backfill skipped:', err)
  }
}

// Job Management Functions

/**
 * Create a new Polaris job
 */
export async function createJob(data: {
  title?: string
  company_name?: string
  experience_level?: string
}): Promise<{ data: PolarisJob | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    const { data: job, error } = await supabase
      .from('polaris_jobs')
      .insert({
        user_id: user.id,
        title: data.title,
        company_name: data.company_name,
        experience_level: data.experience_level,
        current_stage: 'greeting',
        status: 'draft',
        session_state: {}
      })
      .select()
      .single()
    
    if (error) return { data: null, error }
    
    // Log activity
    await logActivity(job.id, 'started', 'greeting', { 
      initial_data: data 
    })
    
    return { data: job, error: null }
  } catch (err) {
    console.error('Error creating job:', err)
    return { data: null, error: err }
  }
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<{ data: PolarisJob | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('polaris_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    console.error('Error getting job:', err)
    return { data: null, error: err }
  }
}

/**
 * Get user's jobs
 */
export async function getUserJobs(
  limit: number = 20,
  status?: PolarisJobStatus
): Promise<{ data: PolarisJob[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: new Error('Not authenticated') }
    
    // Opportunistically backfill legacy summaries into jobs (idempotent)
    await backfillLegacyJobsForUser()

    let query = supabase
      .from('polaris_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting user jobs:', err)
    return { data: [], error: err }
  }
}

/**
 * Update job data for a specific stage
 */
export async function updateJobStageData(
  jobId: string,
  stage: 'greeting' | 'organization' | 'requirements' | 'dynamic_questions',
  data: Record<string, any>
): Promise<{ error: any }> {
  try {
    const updateData: any = {}
    
    switch (stage) {
      case 'greeting':
        updateData.greeting_data = data
        break
      case 'organization':
        updateData.org_data = data
        break
      case 'requirements':
        updateData.requirements_data = data
        break
      case 'dynamic_questions':
        updateData.dynamic_answers = data
        break
    }
    
    const { error } = await supabase
      .from('polaris_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'data_saved', stage as PolarisJobStage, { 
      fields_updated: Object.keys(data) 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error updating job stage data:', err)
    return { error: err }
  }
}

/**
 * Save a generated report to a job
 */
export async function saveJobReport(
  jobId: string,
  reportType: ReportType,
  content: string,
  metadata?: Record<string, any>
): Promise<{ error: any }> {
  try {
    // Update the job with the report
    const updateData: any = {}
    const reportField = `${reportType}_report`
    updateData[reportField] = content
    
    const { error: updateError } = await supabase
      .from('polaris_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (updateError) return { error: updateError }
    
    // Also save to reports table for versioning
    const { error: reportError } = await supabase
      .from('polaris_job_reports')
      .insert({
        job_id: jobId,
        report_type: reportType,
        content,
        metadata: metadata || {},
        generated_by: 'ai'
      })
    
    if (reportError) return { error: reportError }
    
    await logActivity(jobId, 'report_generated', undefined, { 
      report_type: reportType,
      length: content.length 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error saving job report:', err)
    return { error: err }
  }
}

/**
 * Persist generated dynamic questions so sessions can resume reliably.
 */
export async function saveDynamicQuestions(
  jobId: string,
  questions: any[]
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('polaris_jobs')
      .update({ dynamic_questions: questions })
      .eq('id', jobId)

    if (error) return { error }

    await logActivity(jobId, 'dynamic_questions_generated', 'dynamic_questions', {
      count: Array.isArray(questions) ? questions.length : 0
    })

    return { error: null }
  } catch (err) {
    console.error('Error saving dynamic questions:', err)
    return { error: err }
  }
}

/**
 * Edit a report (uses one of the 3 edits)
 */
export async function editJobReport(
  jobId: string,
  reportType: ReportType,
  editedContent: string,
  originalContent: string,
  aiAssisted: boolean = false,
  aiDetails?: { prompt?: string; model?: string }
): Promise<{ data: JobEdit | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    // Check if user has edits remaining
    const { data: job, error: jobError } = await getJob(jobId)
    if (jobError || !job) return { data: null, error: jobError || new Error('Job not found') }
    
    if (job.edits_remaining <= 0) {
      return { data: null, error: new Error('No edits remaining for this job') }
    }
    
    // Save the edit
    const { data: edit, error: editError } = await supabase
      .from('polaris_job_edits')
      .insert({
        job_id: jobId,
        user_id: user.id,
        report_type: reportType,
        original_content: originalContent,
        edited_content: editedContent,
        ai_assisted: aiAssisted,
        ai_prompt: aiDetails?.prompt,
        ai_model: aiDetails?.model
      })
      .select()
      .single()
    
    if (editError) return { data: null, error: editError }
    
    // Update the job with edited content
    const updateData: any = {}
    const editedField = `${reportType}_report_edited`
    updateData[editedField] = editedContent
    
    const { error: updateError } = await supabase
      .from('polaris_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (updateError) return { data: null, error: updateError }
    
    // Save new version to reports table
    await supabase
      .from('polaris_job_reports')
      .insert({
        job_id: jobId,
        report_type: reportType,
        content: editedContent,
        metadata: { edited: true, edit_number: edit.edit_number },
        generated_by: 'user'
      })
    
    await logActivity(jobId, 'report_edited', undefined, { 
      report_type: reportType,
      edit_number: edit.edit_number,
      ai_assisted: aiAssisted 
    })
    
    return { data: edit, error: null }
  } catch (err) {
    console.error('Error editing job report:', err)
    return { data: null, error: err }
  }
}

/**
 * Update job title
 */
export async function updateJobTitle(jobId: string, newTitle: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('polaris_jobs')
      .update({ title: newTitle })
      .eq('id', jobId)
    return { error }
  } catch (err) {
    console.error('Error updating job title:', err)
    return { error: err }
  }
}

/**
 * Update job stage and status
 */
export async function updateJobProgress(
  jobId: string,
  stage: PolarisJobStage,
  status: PolarisJobStatus,
  markStageComplete: boolean = false
): Promise<{ error: any }> {
  try {
    const { data: job, error: getError } = await getJob(jobId)
    if (getError || !job) return { error: getError || new Error('Job not found') }
    
    const stagesCompleted = [...job.stages_completed]
    if (markStageComplete && !stagesCompleted.includes(stage)) {
      stagesCompleted.push(stage)
    }
    
    const updateData: any = {
      current_stage: stage,
      status,
      stages_completed: stagesCompleted
    }
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('polaris_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'stage_updated', stage, { 
      new_status: status,
      completed: markStageComplete 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error updating job progress:', err)
    return { error: err }
  }
}

/**
 * Save session state for resuming
 */
export async function saveSessionState(
  jobId: string,
  state: Record<string, any>
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('polaris_jobs')
      .update({ 
        session_state: state,
        status: 'paused'
      })
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'session_saved', undefined, { 
      state_keys: Object.keys(state) 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error saving session state:', err)
    return { error: err }
  }
}

/**
 * Resume a paused job
 */
export async function resumeJob(jobId: string): Promise<{ data: PolarisJob | null; error: any }> {
  try {
    const { data: job, error: getError } = await getJob(jobId)
    if (getError || !job) return { data: null, error: getError || new Error('Job not found') }
    
    const { error: updateError } = await supabase
      .from('polaris_jobs')
      .update({ status: 'draft' })
      .eq('id', jobId)
    
    if (updateError) return { data: null, error: updateError }
    
    await logActivity(jobId, 'resumed', job.current_stage, {
      previous_status: job.status
    })
    
    return { data: { ...job, status: 'draft' }, error: null }
  } catch (err) {
    console.error('Error resuming job:', err)
    return { data: null, error: err }
  }
}

/**
 * Delete a job (cascades to all related data)
 */
export async function deleteJob(jobId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('polaris_jobs')
      .delete()
      .eq('id', jobId)
    
    if (error) return { error }
    return { error: null }
  } catch (err) {
    console.error('Error deleting job:', err)
    return { error: err }
  }
}

/**
 * Get job reports
 */
export async function getJobReports(
  jobId: string,
  reportType?: ReportType
): Promise<{ data: JobReport[]; error: any }> {
  try {
    let query = supabase
      .from('polaris_job_reports')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    
    if (reportType) {
      query = query.eq('report_type', reportType)
    }
    
    const { data, error } = await query
    
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting job reports:', err)
    return { data: [], error: err }
  }
}

/**
 * Get job edits
 */
export async function getJobEdits(jobId: string): Promise<{ data: JobEdit[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('polaris_job_edits')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
    
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting job edits:', err)
    return { data: [], error: err }
  }
}

/**
 * Get job activity log
 */
export async function getJobActivity(jobId: string): Promise<{ data: JobActivity[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('polaris_job_activity')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting job activity:', err)
    return { data: [], error: err }
  }
}

/**
 * Log activity for a job
 */
async function logActivity(
  jobId: string,
  action: string,
  stage?: PolarisJobStage,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    await supabase
      .from('polaris_job_activity')
      .insert({
        job_id: jobId,
        user_id: user.id,
        action,
        stage,
        details: details || {}
      })
  } catch (err) {
    console.error('Error logging activity:', err)
  }
}

/**
 * Get the current/latest report content for a job
 * Returns edited version if available, otherwise original
 */
export function getJobReportContent(
  job: PolarisJob,
  reportType: ReportType
): string | null {
  const editedField = `${reportType}_report_edited` as keyof PolarisJob
  const originalField = `${reportType}_report` as keyof PolarisJob
  
  const edited = job[editedField] as string | undefined
  const original = job[originalField] as string | undefined
  
  return edited || original || null
}

/**
 * Check if a report has been edited
 */
export function isReportEdited(
  job: PolarisJob,
  reportType: ReportType
): boolean {
  const editedField = `${reportType}_report_edited` as keyof PolarisJob
  return !!job[editedField]
}

/**
 * Get job statistics for dashboard
 */
export async function getJobStats(): Promise<{ 
  data: {
    total: number
    completed: number
    inProgress: number
    paused: number
    averageEditsUsed: number
  } | null; 
  error: any 
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    const { data: jobs, error } = await supabase
      .from('polaris_jobs')
      .select('status, edits_used')
      .eq('user_id', user.id)
    
    if (error || !jobs) return { data: null, error }
    
    const stats = {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      inProgress: jobs.filter(j => j.status === 'draft' || j.status === 'processing').length,
      paused: jobs.filter(j => j.status === 'paused').length,
      averageEditsUsed: jobs.reduce((sum, j) => sum + j.edits_used, 0) / (jobs.length || 1)
    }
    
    return { data: stats, error: null }
  } catch (err) {
    console.error('Error getting job stats:', err)
    return { data: null, error: err }
  }
}

/**
 * Export a job as a complete document
 */
export async function exportJob(jobId: string): Promise<{ 
  data: {
    job: PolarisJob
    reports: JobReport[]
    edits: JobEdit[]
    activity: JobActivity[]
  } | null;
  error: any 
}> {
  try {
    const [jobResult, reportsResult, editsResult, activityResult] = await Promise.all([
      getJob(jobId),
      getJobReports(jobId),
      getJobEdits(jobId),
      getJobActivity(jobId)
    ])
    
    if (jobResult.error || !jobResult.data) {
      return { data: null, error: jobResult.error || new Error('Job not found') }
    }
    
    return {
      data: {
        job: jobResult.data,
        reports: reportsResult.data,
        edits: editsResult.data,
        activity: activityResult.data
      },
      error: null
    }
  } catch (err) {
    console.error('Error exporting job:', err)
    return { data: null, error: err }
  }
}
