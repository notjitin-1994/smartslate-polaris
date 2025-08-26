import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const webhookSecret = process.env.WEBHOOK_SECRET || ''
const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173'
const webhookTimeoutMs = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000')
const webhookMaxRetries = parseInt(process.env.WEBHOOK_MAX_RETRIES || '3')

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key')
}

function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  return `sha256=${hmac.digest('hex')}`
}

async function callWebhook(
  endpoint: string,
  payload: any,
  retryAttempt: number = 0
): Promise<{ success: boolean; response?: any; error?: string }> {
  if (!webhookSecret) {
    return { success: false, error: 'Webhook secret not configured' }
  }

  try {
    const payloadString = JSON.stringify(payload)
    const signature = generateWebhookSignature(payloadString, webhookSecret)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), webhookTimeoutMs)
    
    const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/${endpoint}`
    
    console.log(`Calling webhook ${webhookUrl} (attempt ${retryAttempt + 1}/${webhookMaxRetries + 1})`)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Polaris-Webhook/1.0'
      },
      body: payloadString,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`Webhook ${webhookUrl} succeeded on attempt ${retryAttempt + 1}`)
    
    return { success: true, response: responseData }
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown webhook error'
    console.error(`Webhook ${endpoint} failed (attempt ${retryAttempt + 1}):`, errorMessage)
    
    // Retry with exponential backoff
    if (retryAttempt < webhookMaxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000)
      console.log(`Retrying webhook ${endpoint} in ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return callWebhook(endpoint, payload, retryAttempt + 1)
    }
    
    return { success: false, error: errorMessage }
  }
}

async function notifyReportCompletion(
  jobId: string,
  reportId: string,
  reportType: string,
  researchReport: string,
  researchStatus: 'completed' | 'failed',
  researchMetadata: Record<string, any>,
  errorMessage?: string
): Promise<{ success: boolean; usedWebhook: boolean; error?: string }> {
  const payload = {
    job_id: jobId,
    report_id: reportId,
    report_type: reportType,
    research_report: researchReport,
    research_status: researchStatus,
    research_metadata: researchMetadata,
    ...(errorMessage && { error: errorMessage })
  }

  // Try webhook first
  const webhookResult = await callWebhook('prelim-report', payload)
  
  if (webhookResult.success) {
    return { success: true, usedWebhook: true }
  }

  // Fallback to direct database update if webhook fails
  console.warn(`Webhook failed for job ${jobId}, falling back to direct database update`)
  return { success: false, usedWebhook: false, error: webhookResult.error }
}

async function directDatabaseUpdate(
  jobId: string,
  reportId: string,
  reportTable: string,
  researchReport: string,
  researchStatus: 'completed' | 'failed',
  researchMetadata: Record<string, any>,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  try {
    const updateData: any = {
      research_report: researchReport,
      research_status: researchStatus,
      research_metadata: {
        ...researchMetadata,
        job_id: jobId,
        fallback_update: true,
        webhook_failed: true,
        updated_at: new Date().toISOString()
      },
      webhook_status: 'failed'
    }

    if (errorMessage) {
      updateData.research_metadata.error = errorMessage
    }

    const { error } = await supabase
      .from(reportTable)
      .update(updateData)
      .eq('id', reportId)

    if (error) {
      console.error(`Direct database update failed for ${reportTable}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`Direct database update succeeded for job ${jobId}, report ${reportId}`)
    return { success: true }
  } catch (err: any) {
    const errorMsg = err?.message || 'Database update failed'
    console.error(`Direct database update error for job ${jobId}:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

function normalizePerplexityModel(input?: string): string {
  const requested = (input || '').trim().toLowerCase()
  const canonical = new Set(['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'])
  if (canonical.has(requested)) return requested
  const normalized = requested.replace(/\s+/g, '-').replace(/_/g, '-')
  if (canonical.has(normalized)) return normalized
  if (requested === 'sonar pro' || requested === 'sonar-large') return 'sonar-pro'
  if (requested === 'sonar reasoning') return 'sonar-reasoning'
  if (requested === 'sonar reasoning pro') return 'sonar-reasoning-pro'
  if (requested.startsWith('llama-3.1-sonar-small')) return 'sonar'
  if (requested.startsWith('llama-3.1-sonar-large')) return 'sonar-pro'
  return 'sonar'
}

function getReportTableFromType(type?: string): string | null {
  if (!type) return null
  const t = String(type).toLowerCase()
  if (t === 'greeting') return 'greeting_reports'
  if (t === 'org' || t === 'organization') return 'org_reports'
  if (t === 'requirement' || t === 'requirements') return 'requirement_reports'
  return null
}

async function runJob(jobId: string, prompt: string, model?: string, temperature: number = 0.2, max_tokens: number = 2600) {
  if (!supabase) {
    console.error('Supabase not initialized')
    return
  }

  try {
    // Read job metadata to know which report row to update
    const { data: jobRow } = await supabase
      .from('report_jobs')
      .select('metadata, summary_id, user_id')
      .eq('job_id', jobId)
      .single()

    const reportType = (jobRow as any)?.metadata?.report_type as string | undefined
    const reportId = (jobRow as any)?.metadata?.report_id as string | undefined
    const reportTable = getReportTableFromType(reportType)

    // Update job status to running
    const { error: updateError } = await supabase
      .from('report_jobs')
      .update({ 
        status: 'running', 
        percent: 5,
        started_at: new Date().toISOString()
      })
      .eq('job_id', jobId)

    if (updateError) {
      console.error(`Failed to update job ${jobId} to running:`, updateError)
      return
    }

    // Also reflect running state in the target report row if provided
    if (reportTable && reportId) {
      await supabase
        .from(reportTable)
        .update({
          research_status: 'running',
          research_metadata: {
            ...(jobRow as any)?.metadata,
            job_id: jobId,
            model: model || process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar-pro',
            started_at: new Date().toISOString(),
          }
        })
        .eq('id', reportId)
    }

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || ''
    const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL || process.env.VITE_PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
    const mdl = normalizePerplexityModel(model || process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar-pro')

    if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured')

    // Compose user message with a short preamble as Perplexity lacks system role
    const contextualPrompt = `You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.\n\n${prompt}`

    const controller = new AbortController()
    const isReasoningModel = mdl.includes('reasoning')
    const baseTimeout = Number(process.env.PPLX_SERVER_TIMEOUT_MS || 75000)
    const SERVER_TIMEOUT_MS = isReasoningModel ? Math.min(110000, Math.floor(baseTimeout * 1.5)) : baseTimeout
    const timeoutId = setTimeout(() => {
      console.warn(`Job ${jobId} timing out after ${SERVER_TIMEOUT_MS}ms`)
      controller.abort()
    }, SERVER_TIMEOUT_MS)

    // Update progress
    await supabase
      .from('report_jobs')
      .update({ percent: 15, eta_seconds: Math.ceil(SERVER_TIMEOUT_MS / 1000) })
      .eq('job_id', jobId)

    const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mdl,
        temperature,
        max_tokens,
        messages: [{ role: 'user', content: contextualPrompt }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Perplexity API error ${response.status}: ${errorText}`)
    }

    // Update progress
    await supabase
      .from('report_jobs')
      .update({ percent: 80 })
      .eq('job_id', jobId)

    const data: any = await response.json()
    const content: string = data?.choices?.[0]?.message?.content || ''
    
    // Update job with result
    const { error: completeError } = await supabase
      .from('report_jobs')
      .update({
        status: 'succeeded',
        result: content.trim(),
        percent: 100,
        eta_seconds: 0,
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId)

    if (completeError) {
      console.error(`Failed to complete job ${jobId}:`, completeError)
    }

    // Notify report completion via webhook
    if (reportTable && reportId && reportType) {
      const researchMetadata = {
        ...(jobRow as any)?.metadata,
        job_id: jobId,
        model: mdl,
        completed_at: new Date().toISOString(),
        provider: 'perplexity'
      }

      const webhookResult = await notifyReportCompletion(
        jobId,
        reportId,
        reportType,
        content.trim(),
        'completed',
        researchMetadata
      )

      // If webhook failed, fall back to direct database update
      if (!webhookResult.success && !webhookResult.usedWebhook) {
        console.warn(`Webhook failed for job ${jobId}, using direct database fallback`)
        const fallbackResult = await directDatabaseUpdate(
          jobId,
          reportId,
          reportTable,
          content.trim(),
          'completed',
          researchMetadata
        )
        
        if (!fallbackResult.success) {
          console.error(`Both webhook and database fallback failed for job ${jobId}`)
        }
      }
    }
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err?.message || err)
    
    if (supabase) {
      await supabase
        .from('report_jobs')
        .update({
          status: 'failed',
          error: err?.message || 'Job failed',
          percent: 100,
          eta_seconds: 0,
          completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
    }

    // Reflect failure in the target report row via webhook
    try {
      const { data: jobRow } = await supabase
        .from('report_jobs')
        .select('metadata')
        .eq('job_id', jobId)
        .single()
      const reportType = (jobRow as any)?.metadata?.report_type as string | undefined
      const reportId = (jobRow as any)?.metadata?.report_id as string | undefined
      const reportTable = getReportTableFromType(reportType)
      
      if (reportTable && reportId && reportType) {
        const researchMetadata = {
          ...(jobRow as any)?.metadata,
          job_id: jobId,
          error: err?.message || 'Job failed',
          failed_at: new Date().toISOString(),
          provider: 'perplexity'
        }

        const webhookResult = await notifyReportCompletion(
          jobId,
          reportId,
          reportType,
          '',  // Empty content for failed jobs
          'failed',
          researchMetadata,
          err?.message || 'Job failed'
        )

        // If webhook failed, fall back to direct database update
        if (!webhookResult.success && !webhookResult.usedWebhook) {
          console.warn(`Failure webhook failed for job ${jobId}, using direct database fallback`)
          await directDatabaseUpdate(
            jobId,
            reportId,
            reportTable,
            '',
            'failed',
            researchMetadata,
            err?.message || 'Job failed'
          )
        }
      }
    } catch (updateErr) {
      console.error(`Failed to update report failure status for job ${jobId}:`, updateErr)
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Check if database is configured
  if (!supabase) {
    // Fallback to in-memory implementation if database not configured
    console.warn('Database not configured, falling back to in-memory storage')
    const inMemoryHandler = await import('./reportJobs')
    return inMemoryHandler.default(req, res)
  }

  if (req.method === 'POST') {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotency_key as string) || ''
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
      const prompt: string = body.prompt
      const model: string | undefined = body.model
      const temperature: number | undefined = body.temperature
      const max_tokens: number | undefined = body.max_tokens
      const summary_id: string | undefined = body.summary_id
      const user_id: string | undefined = body.user_id
      const metadataFromBody: any = body.metadata || {}
      const report_type: string | undefined = body.report_type || metadataFromBody.report_type
      const report_id: string | undefined = body.report_id || metadataFromBody.report_id

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'prompt is required' })
      }

      // Check for existing job with idempotency key
      if (idempotencyKey) {
        const { data: existing } = await supabase
          .from('report_jobs')
          .select('job_id')
          .eq('idempotency_key', idempotencyKey)
          .single()
        
        if (existing) {
          return res.status(202).json({ 
            job_id: existing.job_id, 
            status_url: `/api/reportJobsDb?job_id=${existing.job_id}` 
          })
        }
      }

      // Create new job
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      
      const { error: insertError } = await supabase
        .from('report_jobs')
        .insert({
          job_id: jobId,
          user_id: user_id || null,
          summary_id: summary_id || null,
          status: 'queued',
          model: model || 'sonar',
          prompt: prompt.substring(0, 10000), // Limit prompt size
          temperature: temperature || 0.2,
          max_tokens: max_tokens || 2600,
          percent: 0,
          eta_seconds: 90,
          idempotency_key: idempotencyKey || null,
          metadata: {
            source: 'api',
            timestamp: new Date().toISOString(),
            ...(metadataFromBody || {}),
            ...(report_type ? { report_type } : {}),
            ...(report_id ? { report_id } : {}),
          }
        })

      if (insertError) {
        console.error('Failed to create job:', insertError)
        return res.status(500).json({ error: 'Failed to create job' })
      }

      // Start job asynchronously
      setTimeout(() => {
        void runJob(jobId, prompt, model, temperature, max_tokens)
      }, 5)

      return res.status(202).json({ 
        job_id: jobId, 
        status_url: `/api/reportJobsDb?job_id=${jobId}` 
      })
    } catch (e: any) {
      console.error('Error in POST handler:', e)
      return res.status(500).json({ error: e?.message || 'Failed to create job' })
    }
  }

  if (req.method === 'GET') {
    const jobId = (req.query?.job_id as string) || ''
    if (!jobId) return res.status(400).json({ error: 'job_id is required' })
    
    try {
      const { data: job, error } = await supabase
        .from('report_jobs')
        .select('job_id, status, percent, eta_seconds, result, error')
        .eq('job_id', jobId)
        .single()
      
      if (error || !job) {
        return res.status(404).json({ error: 'Job not found' })
      }
      
      return res.status(200).json({
        job_id: job.job_id,
        status: job.status,
        percent: job.percent ?? 0,
        eta_seconds: job.eta_seconds ?? 0,
        result: job.result ?? null,
        error: job.error ?? null
      })
    } catch (e: any) {
      console.error('Error in GET handler:', e)
      return res.status(500).json({ error: 'Failed to get job status' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
