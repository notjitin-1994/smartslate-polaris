import { getSupabase } from '@/lib/supabaseClient'
const supabase = getSupabase()

export interface ReportJob {
  id?: string
  job_id: string
  user_id?: string
  summary_id?: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  model?: string
  prompt?: string
  temperature?: number
  max_tokens?: number
  result?: string | null
  error?: string | null
  percent?: number
  eta_seconds?: number
  idempotency_key?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
  started_at?: string
  completed_at?: string
  expires_at?: string
}

/**
 * Create a new report job in the database
 */
export async function createReportJob(job: Omit<ReportJob, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: ReportJob | null; error: any }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('report_jobs')
      .insert({
        ...job,
        user_id: job.user_id || user?.id,
        percent: job.percent || 0,
        eta_seconds: job.eta_seconds || 90,
        metadata: job.metadata || {}
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create report job:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Error creating report job:', err)
    return { data: null, error: err }
  }
}

/**
 * Get a report job by job_id
 */
export async function getReportJob(jobId: string): Promise<{ data: ReportJob | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Failed to get report job:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Error getting report job:', err)
    return { data: null, error: err }
  }
}

/**
 * Update a report job
 */
export async function updateReportJob(
  jobId: string, 
  updates: Partial<ReportJob>
): Promise<{ data: ReportJob | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('report_jobs')
      .update(updates)
      .eq('job_id', jobId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update report job:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Error updating report job:', err)
    return { data: null, error: err }
  }
}

/**
 * Check for existing job with idempotency key
 */
export async function findJobByIdempotencyKey(key: string): Promise<{ data: ReportJob | null; error: any }> {
  try {
    const { data } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('idempotency_key', key)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    return { data, error: null }
  } catch (err) {
    console.error('Error finding job by idempotency key:', err)
    return { data: null, error: err }
  }
}

/**
 * Get user's recent jobs
 */
export async function getUserReportJobs(
  userId?: string,
  limit: number = 10
): Promise<{ data: ReportJob[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id
    
    if (!targetUserId) {
      return { data: [], error: 'No user ID provided' }
    }
    
    const { data, error } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Failed to get user report jobs:', error)
      return { data: [], error }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting user report jobs:', err)
    return { data: [], error: err }
  }
}

/**
 * Get jobs for a specific summary
 */
export async function getSummaryReportJobs(
  summaryId: string
): Promise<{ data: ReportJob[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('summary_id', summaryId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get summary report jobs:', error)
      return { data: [], error }
    }
    
    return { data: data || [], error: null }
  } catch (err) {
    console.error('Error getting summary report jobs:', err)
    return { data: [], error: err }
  }
}

/**
 * Cancel a job
 */
export async function cancelReportJob(jobId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('report_jobs')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .in('status', ['queued', 'running'])
    
    if (error) {
      console.error('Failed to cancel report job:', error)
      return { error }
    }
    
    return { error: null }
  } catch (err) {
    console.error('Error cancelling report job:', err)
    return { error: err }
  }
}

/**
 * Clean up old jobs
 */
export async function cleanupOldJobs(): Promise<{ count: number; error: any }> {
  try {
    // Clean up expired jobs
    const { data: expired, error: expiredError } = await supabase
      .from('report_jobs')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')
    
    if (expiredError) {
      console.error('Failed to clean up expired jobs:', expiredError)
      return { count: 0, error: expiredError }
    }
    
    // Clean up completed jobs older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: old, error: oldError } = await supabase
      .from('report_jobs')
      .delete()
      .in('status', ['succeeded', 'failed', 'cancelled'])
      .lt('completed_at', oneDayAgo)
      .select('id')
    
    if (oldError) {
      console.error('Failed to clean up old jobs:', oldError)
      return { count: expired?.length || 0, error: oldError }
    }
    
    const totalCleaned = (expired?.length || 0) + (old?.length || 0)
    console.log(`Cleaned up ${totalCleaned} old report jobs`)
    
    return { count: totalCleaned, error: null }
  } catch (err) {
    console.error('Error cleaning up old jobs:', err)
    return { count: 0, error: err }
  }
}

/**
 * Get job statistics for monitoring
 */
export async function getJobStatistics(): Promise<{
  data: {
    total: number
    queued: number
    running: number
    succeeded: number
    failed: number
    avgDurationMs: number
  } | null
  error: any
}> {
  try {
    const { data, error } = await supabase
      .from('report_jobs')
      .select('status, started_at, completed_at')
    
    if (error) {
      console.error('Failed to get job statistics:', error)
      return { data: null, error }
    }
    
    const stats = {
      total: data?.length || 0,
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      avgDurationMs: 0
    }
    
    let totalDuration = 0
    let completedCount = 0
    
    data?.forEach((job: any) => {
      if (job.status in stats) {
        (stats as any)[job.status]++
      }
      
      if (job.started_at && job.completed_at) {
        const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        totalDuration += duration
        completedCount++
      }
    })
    
    if (completedCount > 0) {
      stats.avgDurationMs = Math.round(totalDuration / completedCount)
    }
    
    return { data: stats, error: null }
  } catch (err) {
    console.error('Error getting job statistics:', err)
    return { data: null, error: err }
  }
}
