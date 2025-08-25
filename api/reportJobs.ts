import type { VercelRequest, VercelResponse } from '@vercel/node'

type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

type ReportJob = {
  id: string
  status: JobStatus
  percent: number
  eta_seconds: number
  result?: string | null
  error?: string | null
  created_at: number
  updated_at: number
}

// Very lightweight in-memory job store for asynchronous report generation.
// NOTE: For production, persist to a durable store (e.g., Supabase) instead.
// Adding cleanup for old jobs to prevent memory leaks
const getStore = () => {
  const g = globalThis as any
  if (!g.__REPORT_JOBS__) g.__REPORT_JOBS__ = new Map<string, ReportJob>()
  const store = g.__REPORT_JOBS__ as Map<string, ReportJob>
  
  // Clean up jobs older than 5 minutes
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes
  for (const [id, job] of store) {
    if (now - job.created_at > maxAge && (job.status === 'succeeded' || job.status === 'failed')) {
      store.delete(id)
    }
  }
  
  return store
}

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
  if (requested === 'sonar pro' || requested === 'sonar-large' || requested === 'sonar medium' || requested === 'sonar-medium') return 'sonar-pro'
  if (requested === 'sonar reasoning' || requested === 'sonar-reasoning') return 'sonar-reasoning'
  if (requested === 'sonar reasoning pro' || requested === 'sonar-reasoning-pro') return 'sonar-reasoning-pro'
  if (requested.startsWith('llama-3.1-sonar-small')) return 'sonar'
  if (requested.startsWith('llama-3.1-sonar-large')) return 'sonar-pro'
  return 'sonar'
}

async function runJob(jobId: string, prompt: string, model?: string, temperature: number = 0.2, max_tokens: number = 2600) {
  const store = getStore()
  const job = store.get(jobId)
  if (!job) {
    console.error(`Job ${jobId} not found in store`)
    return
  }
  job.status = 'running'
  job.percent = 5
  job.updated_at = Date.now()
  store.set(jobId, job)

  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || ''
    const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL || process.env.VITE_PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
    const mdl = normalizePerplexityModel(model || process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar')

    if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured')

    // Compose user message with a short preamble as Perplexity lacks system role
    const contextualPrompt = `You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.\n\n${prompt}`

    const controller = new AbortController()
    // Extended timeout for sonar-reasoning model
    const isReasoningModel = (model || '').toLowerCase().includes('reasoning')
    const baseTimeout = Number(process.env.PPLX_SERVER_TIMEOUT_MS || 60000)
    const SERVER_TIMEOUT_MS = isReasoningModel ? Math.min(110000, baseTimeout * 2) : baseTimeout
    const timeoutId = setTimeout(() => {
      console.warn(`Job ${jobId} timing out after ${SERVER_TIMEOUT_MS}ms`)
      controller.abort()
    }, SERVER_TIMEOUT_MS)

    job.percent = 15
    job.eta_seconds = Math.ceil(SERVER_TIMEOUT_MS / 1000)
    job.updated_at = Date.now()
    store.set(jobId, job)

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

    // Simulate progress updates while waiting to parse
    job.percent = 80
    job.updated_at = Date.now()
    store.set(jobId, job)

    const data: any = await response.json()
    const content: string = data?.choices?.[0]?.message?.content || ''
    job.result = (content || '').trim()
    job.status = 'succeeded'
    job.percent = 100
    job.eta_seconds = 0
    job.updated_at = Date.now()
    store.set(jobId, job)
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err?.message || err)
    const store2 = getStore()
    const job2 = store2.get(jobId)
    if (!job2) {
      console.error(`Job ${jobId} not found in store during error handling`)
      return
    }
    job2.status = 'failed'
    job2.error = err?.message || 'Job failed'
    job2.percent = 100
    job2.eta_seconds = 0
    job2.updated_at = Date.now()
    store2.set(jobId, job2)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const store = getStore()

  if (req.method === 'POST') {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotency_key as string) || ''
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
      const prompt: string = body.prompt
      const model: string | undefined = body.model
      const temperature: number | undefined = body.temperature
      const max_tokens: number | undefined = body.max_tokens

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'prompt is required' })
      }

      // Idempotency: if a job exists for this key, return it
      if (idempotencyKey) {
        for (const [, j] of store) {
          if ((j as any).idempotency_key === idempotencyKey) {
            return res.status(202).json({ job_id: j.id, status_url: `/api/reportJobs?job_id=${j.id}` })
          }
        }
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      const now = Date.now()
      const job: ReportJob = {
        id: jobId,
        status: 'queued',
        percent: 0,
        eta_seconds: 90,
        result: null,
        error: null,
        created_at: now,
        updated_at: now,
      }
      ;(job as any).idempotency_key = idempotencyKey || null
      store.set(jobId, job)

      // Kick off job asynchronously (fire-and-forget)
      // For reasoning models, return job ID immediately for true async
      const isReasoningModel = (model || '').toLowerCase().includes('reasoning')
      setTimeout(() => {
        void runJob(jobId, prompt, model, temperature, max_tokens)
      }, 5)
      
      // Store job metadata for later retrieval
      ;(job as any).is_reasoning = isReasoningModel
      ;(job as any).model = model
      store.set(jobId, job)

      return res.status(202).json({ job_id: jobId, status_url: `/api/reportJobs?job_id=${jobId}` })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to create job' })
    }
  }

  if (req.method === 'GET') {
    const jobId = (req.query?.job_id as string) || ''
    if (!jobId) return res.status(400).json({ error: 'job_id is required' })
    const job = store.get(jobId)
    if (!job) return res.status(404).json({ error: 'job not found' })
    return res.status(200).json({ job_id: job.id, status: job.status, percent: job.percent, eta_seconds: job.eta_seconds, result: job.result ?? null, error: job.error ?? null })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}


