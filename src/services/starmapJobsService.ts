import { getSupabase } from '@/lib/supabaseClient'

const supabase = getSupabase()

// Types
export type StarmapJobStatus = 
  | 'draft'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface StarmapJob {
  id: string
  user_id: string
  title?: string
  status: StarmapJobStatus
  
  // Stage tracking
  experience_level?: string
  stage1_complete: boolean
  stage2_complete: boolean
  stage3_complete: boolean
  dynamic_complete: boolean
  
  // Collected data
  stage1_data: Record<string, any>
  stage2_data: Record<string, any>
  stage3_data: Record<string, any>
  dynamic_questions: any[]
  dynamic_answers: Record<string, any>
  
  // Generated reports
  preliminary_report?: string
  final_report?: string
  
  // Async job tracking
  report_job_id?: string
  report_job_status?: string
  report_job_progress?: number
  report_job_error?: string
  
  // Session state
  session_state: Record<string, any>
  last_saved_at: string
  
  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string
  
  // Legacy
  legacy_summary_id?: string
}

export interface StarmapJobActivity {
  id: string
  job_id: string
  user_id: string
  action: string
  details: Record<string, any>
  created_at: string
}

/**
 * Create a new starmap job
 */
export async function createStarmapJob(data?: {
  title?: string
  experience_level?: string
}): Promise<{ data: StarmapJob | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    const { data: job, error } = await supabase
      .from('starmap_jobs')
      .insert({
        user_id: user.id,
        title: data?.title || 'New Starmap Discovery',
        experience_level: data?.experience_level,
        status: 'draft',
        session_state: {}
      })
      .select()
      .single()
    
    if (error) return { data: null, error }
    
    // Log activity
    await logActivity(job.id, 'created', { 
      initial_data: data 
    })
    
    return { data: job, error: null }
  } catch (err) {
    console.error('Error creating starmap job:', err)
    return { data: null, error: err }
  }
}

/**
 * Get a job by ID
 */
export async function getStarmapJob(jobId: string): Promise<{ data: StarmapJob | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('starmap_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    console.error('Error getting starmap job:', err)
    return { data: null, error: err }
  }
}

/**
 * Get user's starmap jobs
 */
export async function getUserStarmapJobs(
  limit: number = 20,
  status?: StarmapJobStatus
): Promise<{ data: StarmapJob[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: new Error('Not authenticated') }
    
    let query = supabase
      .from('starmap_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) return { data: [], error }
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting user starmap jobs:', err)
    return { data: [], error: err }
  }
}

/**
 * Update job stage data
 */
export async function updateStarmapJobStageData(
  jobId: string,
  stage: 'stage1' | 'stage2' | 'stage3' | 'dynamic',
  data: Record<string, any>
): Promise<{ error: any }> {
  try {
    const updateData: any = {}
    
    switch (stage) {
      case 'stage1':
        updateData.stage1_data = data
        updateData.stage1_complete = true
        break
      case 'stage2':
        updateData.stage2_data = data
        updateData.stage2_complete = true
        break
      case 'stage3':
        updateData.stage3_data = data
        updateData.stage3_complete = true
        break
      case 'dynamic':
        updateData.dynamic_answers = data
        updateData.dynamic_complete = true
        break
    }
    
    const { error } = await supabase
      .from('starmap_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'stage_saved', { 
      stage,
      fields_updated: Object.keys(data) 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error updating starmap job stage data:', err)
    return { error: err }
  }
}

/**
 * Save dynamic questions
 */
export async function saveDynamicQuestions(
  jobId: string,
  questions: any[]
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('starmap_jobs')
      .update({ 
        dynamic_questions: questions 
      })
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'dynamic_questions_saved', { 
      count: questions.length 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error saving dynamic questions:', err)
    return { error: err }
  }
}

/**
 * Submit job for async processing
 */
export async function submitStarmapJobForProcessing(
  jobId: string,
  prompt: string,
  model?: string,
  reportType: 'preliminary' | 'final' = 'final'
): Promise<{ data: { jobId: string; statusUrl: string } | null; error: any }> {
  try {
    // Update job status to queued
    const { error: updateError } = await supabase
      .from('starmap_jobs')
      .update({ 
        status: 'queued',
        report_job_status: 'queued',
        report_job_progress: 0
      })
      .eq('id', jobId)
    
    if (updateError) return { data: null, error: updateError }
    
    // Submit to async processing endpoint
    const response = await fetch('/api/reportJobsDb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        model: model || 'sonar-pro',
        temperature: 0.2,
        max_tokens: 4000,
        metadata: {
          starmap_job_id: jobId,
          report_type: reportType
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      return { data: null, error: new Error(error) }
    }
    
    const data = await response.json()
    const asyncJobId = data.job_id
    const statusUrl = data.status_url || `/api/reportJobsDb?job_id=${asyncJobId}`
    
    // Update job with async job ID
    await supabase
      .from('starmap_jobs')
      .update({ 
        report_job_id: asyncJobId,
        status: 'processing',
        report_job_status: 'processing'
      })
      .eq('id', jobId)
    
    await logActivity(jobId, 'submitted_for_processing', { 
      async_job_id: asyncJobId,
      report_type: reportType
    })
    
    return { data: { jobId: asyncJobId, statusUrl }, error: null }
  } catch (err) {
    console.error('Error submitting starmap job for processing:', err)
    return { data: null, error: err }
  }
}

/**
 * Check async job status
 */
export async function checkAsyncJobStatus(
  jobId: string
): Promise<{ data: { status: string; progress: number; result?: string; error?: string } | null; error: any }> {
  try {
    const { data: job, error: jobError } = await getStarmapJob(jobId)
    if (jobError || !job) return { data: null, error: jobError || new Error('Job not found') }
    
    if (!job.report_job_id) {
      return { data: null, error: new Error('No async job ID found') }
    }
    
    // Check status from async endpoint
    const response = await fetch(`/api/reportJobsDb?job_id=${encodeURIComponent(job.report_job_id)}`)
    
    if (!response.ok) {
      return { data: null, error: new Error('Failed to check job status') }
    }
    
    const statusData = await response.json()
    
    // Update job with latest status
    const updateData: any = {
      report_job_status: statusData.status,
      report_job_progress: statusData.percent || 0
    }
    
    if (statusData.status === 'succeeded' && statusData.result) {
      updateData.status = 'completed'
      updateData.final_report = statusData.result
      updateData.completed_at = new Date().toISOString()
    } else if (statusData.status === 'failed') {
      updateData.status = 'failed'
      updateData.report_job_error = statusData.error || 'Unknown error'
    }
    
    await supabase
      .from('starmap_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    return {
      data: {
        status: statusData.status,
        progress: statusData.percent || 0,
        result: statusData.result,
        error: statusData.error
      },
      error: null
    }
  } catch (err) {
    console.error('Error checking async job status:', err)
    return { data: null, error: err }
  }
}

/**
 * Save job report
 */
export async function saveJobReport(
  jobId: string,
  reportType: 'preliminary' | 'final',
  content: string
): Promise<{ error: any }> {
  try {
    const updateData: any = {}
    
    if (reportType === 'preliminary') {
      updateData.preliminary_report = content
    } else {
      updateData.final_report = content
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('starmap_jobs')
      .update(updateData)
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'report_saved', { 
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
 * Save session state for resuming
 */
export async function saveSessionState(
  jobId: string,
  state: Record<string, any>
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('starmap_jobs')
      .update({ 
        session_state: state,
        last_saved_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    if (error) return { error }
    
    await logActivity(jobId, 'session_saved', { 
      state_keys: Object.keys(state) 
    })
    
    return { error: null }
  } catch (err) {
    console.error('Error saving session state:', err)
    return { error: err }
  }
}

/**
 * Resume a job
 */
export async function resumeStarmapJob(jobId: string): Promise<{ data: StarmapJob | null; error: any }> {
  try {
    const { data: job, error: getError } = await getStarmapJob(jobId)
    if (getError || !job) return { data: null, error: getError || new Error('Job not found') }
    
    // If job is processing, don't change status
    if (job.status === 'processing') {
      return { data: job, error: null }
    }
    
    const { error: updateError } = await supabase
      .from('starmap_jobs')
      .update({ 
        status: 'draft',
        last_saved_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    if (updateError) return { data: null, error: updateError }
    
    await logActivity(jobId, 'resumed', {
      previous_status: job.status
    })
    
    return { data: { ...job, status: 'draft' }, error: null }
  } catch (err) {
    console.error('Error resuming starmap job:', err)
    return { data: null, error: err }
  }
}

/**
 * Delete a job
 */
export async function deleteStarmapJob(jobId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('starmap_jobs')
      .delete()
      .eq('id', jobId)
    
    if (error) return { error }
    return { error: null }
  } catch (err) {
    console.error('Error deleting starmap job:', err)
    return { error: err }
  }
}

/**
 * Get job activity log
 */
export async function getJobActivity(jobId: string): Promise<{ data: StarmapJobActivity[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('starmap_job_activity')
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
  details?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    await supabase
      .from('starmap_job_activity')
      .insert({
        job_id: jobId,
        user_id: user.id,
        action,
        details: details || {}
      })
  } catch (err) {
    console.error('Error logging activity:', err)
  }
}

/**
 * Get job statistics for dashboard
 */
export async function getStarmapJobStats(): Promise<{ 
  data: {
    total: number
    completed: number
    inProgress: number
    failed: number
  } | null; 
  error: any 
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    const { data: jobs, error } = await supabase
      .from('starmap_jobs')
      .select('status')
      .eq('user_id', user.id)
    
    if (error || !jobs) return { data: null, error }
    
    const stats = {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      inProgress: jobs.filter(j => ['draft', 'queued', 'processing'].includes(j.status)).length,
      failed: jobs.filter(j => j.status === 'failed').length
    }
    
    return { data: stats, error: null }
  } catch (err) {
    console.error('Error getting starmap job stats:', err)
    return { data: null, error: err }
  }
}
