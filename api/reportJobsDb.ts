import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

async function runJob(jobId: string, prompt: string, model?: string, temperature: number = 0.2, max_tokens: number = 2600) {
  if (!supabase) {
    console.error('Supabase not initialized')
    return
  }

  try {
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
            timestamp: new Date().toISOString()
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
