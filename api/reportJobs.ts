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

// Removed unused normalizePerplexityModel

async function runJob(jobId: string, prompt: string, _model?: string, temperature: number = 0.2, _max_tokens: number = 2600) {
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
    // Single-provider policy
    const preferred = (process.env.VITE_LLM_PROVIDER || 'anthropic').toLowerCase().includes('openai') ? 'openai' : 'anthropic'

    // Timeout baseline
    const SERVER_TIMEOUT_MS = Number(process.env.LLM_SERVER_TIMEOUT_MS || 240000)
    job.percent = 15
    job.eta_seconds = Math.ceil(SERVER_TIMEOUT_MS / 1000)
    job.updated_at = Date.now()
    store.set(jobId, job)

    // Dynamic token budgeting
    const approx = (s: string) => Math.ceil(String(s || '').length / 4)
    const desiredMax = Number(process.env.VITE_MAX_OUTPUT_TOKENS || 8096)
    const reserve = 512

    let content = ''
    if (preferred === 'openai') {
      const apiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim()
      const baseUrl = ((process.env.OPENAI_BASE_URL || process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')
      if (!apiKey) throw new Error('OpenAI API key not configured')
      const openaiModel = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim()
      const messages = [
        { role: 'system', content: 'You are a helpful research assistant. Provide comprehensive, accurate information. Cite sources if known.' },
        { role: 'user', content: prompt }
      ]
      const inputTokens = approx(messages.map(m => (m as any).content).join('\n\n'))
      const contextLimit = Number(process.env.VITE_OPENAI_CONTEXT || 128000)
      const maxOut = Math.max(0, Math.min(desiredMax, Math.max(0, contextLimit - inputTokens - reserve)))
      if (maxOut < 1024) throw new Error('Payload too large for OpenAI context')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: openaiModel, temperature: typeof temperature === 'number' ? temperature : 0.2, messages, max_tokens: maxOut, stream: false }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const text = await resp.text()
      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`)
      const data: any = JSON.parse(text)
      const choice = data?.choices?.[0]
      const finishReason = choice?.finish_reason
      if (finishReason && (finishReason === 'length' || finishReason === 'max_tokens')) {
        const err = new Error('Truncated output from OpenAI (length/max_tokens). Reduce inputs and try again.')
        ;(err as any).statusCode = 507
        throw err
      }
      content = choice?.message?.content || ''
      if (!content) throw new Error('Empty content from OpenAI')
    } else {
      const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim()
      const baseUrl = ((process.env.ANTHROPIC_BASE_URL || process.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim()).replace(/\/$/, '')
      const version = (process.env.ANTHROPIC_VERSION || '2023-06-01').trim()
      if (!apiKey) throw new Error('Anthropic API key not configured')
      const anthropicModel = (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()
      const system = 'You are a helpful research assistant. Provide comprehensive, accurate information based on your knowledge. Cite sources if known.'
      const inputText = `${system}\n\n${prompt}`
      const inputTokens = approx(inputText)
      const contextLimit = Number(process.env.VITE_ANTHROPIC_CONTEXT || 200000)
      const maxOut = Math.max(0, Math.min(desiredMax, Math.max(0, contextLimit - inputTokens - reserve)))
      if (maxOut < 1024) throw new Error('Payload too large for Anthropic context')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)
      const resp = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': version },
        body: JSON.stringify({ model: anthropicModel, temperature: typeof temperature === 'number' ? temperature : 0.2, system, messages: [{ role: 'user', content: prompt }], max_tokens: maxOut }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const text = await resp.text()
      if (!resp.ok) throw new Error(text || `HTTP ${resp.status}`)
      const data: any = JSON.parse(text)
      const stopReason = data?.stop_reason
      if (stopReason && stopReason === 'max_tokens') {
        const err = new Error('Truncated output from Anthropic (max_tokens). Reduce inputs and try again.')
        ;(err as any).statusCode = 507
        throw err
      }
      content = Array.isArray(data?.content) ? (data.content.find((c: any) => c.type === 'text')?.text || '') : (data?.content || '')
      if (!content) throw new Error('Empty content from Anthropic')
    }

    // Simulate progress updates while waiting to parse
    job.percent = 80
    job.updated_at = Date.now()
    store.set(jobId, job)

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
  const requestUrl = (req.url || '') as string
  const basePath = requestUrl.includes('reportJobsDb') ? '/api/reportJobsDb' : '/api/reportJobs'

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
            return res.status(202).json({ job_id: j.id, status_url: `${basePath}?job_id=${j.id}` })
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

      return res.status(202).json({ job_id: jobId, status_url: `${basePath}?job_id=${jobId}` })
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


