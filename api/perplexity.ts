import type { VercelRequest, VercelResponse } from '@vercel/node'

// Get Perplexity configuration from environment
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || ''
const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL || process.env.VITE_PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar-pro'

// Performance monitoring
const logPerformance = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime
  console.log(`[API Performance] ${operation}: ${duration}ms`)
  return duration
}

function normalizePerplexityModel(input?: string): string {
  const requested = (input || '').trim().toLowerCase()

  // Accept canonical current model ids as-is
  const canonical = new Set(['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'])
  if (canonical.has(requested)) return requested

  // Normalize common variants (spaces/underscores → hyphens)
  const normalized = requested.replace(/\s+/g, '-').replace(/_/g, '-')
  if (canonical.has(normalized)) return normalized

  // Map legacy or alias names to current ids
  if (requested === 'sonar pro' || requested === 'sonar-large' || requested === 'sonar medium' || requested === 'sonar-medium') {
    return 'sonar-pro'
  }
  if (requested === 'sonar reasoning' || requested === 'sonar-reasoning') {
    return 'sonar-reasoning'
  }
  if (requested === 'sonar reasoning pro' || requested === 'sonar-reasoning-pro') {
    return 'sonar-reasoning-pro'
  }

  // Map deprecated llama-3.1 sonar ids to current equivalents
  if (requested.startsWith('llama-3.1-sonar-small')) return 'sonar'
  if (requested.startsWith('llama-3.1-sonar-large')) return 'sonar-pro'

  // Fallback to safe default
  return 'sonar-pro'
}

// No hardcoded keys. Require valid environment configuration.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now()
  
  // Generate request ID early for tracking throughout the request lifecycle
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  
  // Enhanced CORS with caching headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Helper to normalize and fallback to other providers when Perplexity fails
  function toOpenAIChatCompletion(content: string, model: string) {
    return {
      id: `fallback_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
    }
  }

  async function tryOpenAI(messages: Array<{ role: string; content: string }>, model?: string, temperature?: number, max_tokens?: number) {
    try {
      const apiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim()
      const baseUrl = ((process.env.OPENAI_BASE_URL || process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')
      if (!apiKey) return { ok: false, error: 'OpenAI API key not configured' }
      const defaultModel = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim()
      const payload = {
        model: model || defaultModel,
        temperature: typeof temperature === 'number' ? temperature : 0.2,
        messages: messages.map(m => ({
          role: (m.role === 'system' || m.role === 'assistant' || m.role === 'user') ? m.role : 'user',
          content: m.content,
        })),
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 2048,
      }
      const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })
      const raw = await upstream.text()
      if (!upstream.ok) return { ok: false, status: upstream.status, error: raw }
      let content = ''
      try {
        const data: any = JSON.parse(raw)
        content = data?.choices?.[0]?.message?.content || ''
      } catch {
        content = raw
      }
      return { ok: true, content, model: payload.model }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'OpenAI fallback error' }
    }
  }

  async function tryAnthropic(messages: Array<{ role: string; content: string }>, model?: string, temperature?: number, max_tokens?: number) {
    try {
      const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim()
      const baseUrl = ((process.env.ANTHROPIC_BASE_URL || process.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim()).replace(/\/$/, '')
      const version = (process.env.ANTHROPIC_VERSION || '2023-06-01').trim()
      if (!apiKey) return { ok: false, error: 'Anthropic API key not configured' }
      const defaultModel = (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()
      const temp = typeof temperature === 'number' ? temperature : 0.2
      const max = Math.min(typeof max_tokens === 'number' ? max_tokens : 2048, Number(process.env.ANTHROPIC_MAX_TOKENS || process.env.VITE_ANTHROPIC_MAX_TOKENS || 8192))
      const payload: any = {
        model: model || defaultModel,
        temperature: temp,
        max_tokens: max,
        messages: messages.map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user'), content: m.content })),
      }
      const upstream = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': version,
        },
        body: JSON.stringify(payload),
      })
      const raw = await upstream.text()
      if (!upstream.ok) return { ok: false, status: upstream.status, error: raw }
      let content = ''
      try {
        const data: any = JSON.parse(raw)
        content = Array.isArray(data?.content) ? (data.content.find((c: any) => c.type === 'text')?.text || '') : (data?.content || '')
      } catch {
        content = raw
      }
      return { ok: true, content, model: payload.model }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Anthropic fallback error' }
    }
  }

  try {
    const apiKey = PERPLEXITY_API_KEY

    if (!apiKey) {
      console.error('Perplexity API key not configured – will try fallbacks')
    }

    // Extract and normalize request body (Vercel can pass stringified JSON in prod)
    let body: any = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (e) {
        console.error('Invalid JSON body string:', body)
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }
    // Destructure with defaults
    let { messages, model, temperature = 0.2, max_tokens = 4096 } = body || {}
    // Coerce numeric fields if they came as strings
    if (typeof temperature === 'string') {
      const t = parseFloat(temperature)
      if (!Number.isNaN(t)) temperature = t
    }
    if (typeof max_tokens === 'string') {
      const mt = parseInt(max_tokens, 10)
      if (!Number.isNaN(mt)) max_tokens = mt
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid request body - messages missing or not an array:', req.body)
      return res.status(400).json({ error: 'Messages array is required' })
    }
    
    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        console.error('Invalid message format - missing role or content:', msg)
        return res.status(400).json({ error: 'Each message must have role and content' })
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        console.error('Invalid message role - only "user" and "assistant" are supported:', msg.role)
        return res.status(400).json({ error: 'Message role must be "user" or "assistant"' })
      }
    }

    // Make request to Perplexity API with a server-side timeout below platform max
    const controller = new AbortController()
    const SERVER_TIMEOUT_MS = Number(process.env.PPLX_SERVER_TIMEOUT_MS || 75000)
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)

    const requestPayload = {
      model: normalizePerplexityModel(model || PERPLEXITY_MODEL),
      messages,
      temperature,
      max_tokens,
    }
    
    // Enhanced logging with request ID for tracing
    console.log('[Perplexity API] Request:', {
      requestId,
      url: `${PERPLEXITY_BASE_URL}/chat/completions`,
      model: requestPayload.model,
      messageCount: messages.length,
      temperature,
      max_tokens,
      timestamp: new Date().toISOString()
    })
    
    let response: Response | null = null
    let upstreamErrorText = ''
    let upstreamStatus = 0
    if (apiKey) {
      try {
        response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        })
      } catch (e: any) {
        // Network/Abort errors handled below
      }
    }

    clearTimeout(timeoutId)

    if (response && !response.ok) {
      upstreamStatus = response.status
      upstreamErrorText = await response.text()
      console.error('Perplexity API error:', upstreamStatus, upstreamErrorText)
    }

    // If Perplexity succeeded, passthrough
    if (response && response.ok) {
      const data = await response.json()
      const duration = logPerformance(`Perplexity API call (${requestPayload.model})`, startTime)
      const enhancedResponse = {
        ...(typeof data === 'object' && data !== null ? data : {}),
        metadata: {
          requestId,
          model: requestPayload.model,
          duration,
          timestamp: new Date().toISOString()
        }
      }
      return res.status(200).json(enhancedResponse)
    }

    // Perplexity missing/failed → fallback to OpenAI then Anthropic
    const fbOpenAI = await tryOpenAI(messages, undefined, temperature, max_tokens)
    if (fbOpenAI.ok && fbOpenAI.content) {
      const duration = logPerformance(`Perplexity→OpenAI fallback`, startTime)
      const normalized = toOpenAIChatCompletion(fbOpenAI.content, fbOpenAI.model || 'gpt-4o-mini')
      ;(normalized as any).metadata = { requestId, provider: 'openai', duration, timestamp: new Date().toISOString() }
      res.setHeader('X-Provider-Used', 'openai')
      return res.status(200).json(normalized)
    }

    const fbAnthropic = await tryAnthropic(messages, undefined, temperature, max_tokens)
    if (fbAnthropic.ok && fbAnthropic.content) {
      const duration = logPerformance(`Perplexity→Anthropic fallback`, startTime)
      const normalized = toOpenAIChatCompletion(fbAnthropic.content, fbAnthropic.model || 'claude-3-5-sonnet-latest')
      ;(normalized as any).metadata = { requestId, provider: 'anthropic', duration, timestamp: new Date().toISOString() }
      res.setHeader('X-Provider-Used', 'anthropic')
      return res.status(200).json(normalized)
    }

    // All providers failed
    const duration = Date.now() - startTime
    const combinedError = [
      upstreamStatus ? `Perplexity ${upstreamStatus}: ${upstreamErrorText}` : (apiKey ? 'Perplexity upstream error' : 'Perplexity API key missing'),
      (fbOpenAI as any).ok ? '' : `OpenAI: ${(fbOpenAI as any).error || 'failed'}`,
      (fbAnthropic as any).ok ? '' : `Anthropic: ${(fbAnthropic as any).error || 'failed'}`,
    ].filter(Boolean).join(' | ')
    return res.status(502).json({
      error: 'All providers failed',
      details: combinedError,
      requestId,
      duration,
    })
  } catch (error) {
    // Enhanced error handling with request tracking
    const duration = Date.now() - startTime
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Perplexity API] Timeout:', {
        requestId,
        duration,
        timeout: Number(process.env.PPLX_SERVER_TIMEOUT_MS || 75000)
      })
      return res.status(504).json({ 
        error: 'Upstream timeout',
        details: 'Perplexity request exceeded server timeout',
        requestId,
        duration
      })
    }
    
    console.error('[Perplexity API] Error:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    })
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      duration
    })
  }
}
