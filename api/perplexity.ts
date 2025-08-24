import type { VercelRequest, VercelResponse } from '@vercel/node'

// Get Perplexity configuration from environment
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || ''
const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL || process.env.VITE_PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online'

function normalizePerplexityModel(input?: string): string {
  const requested = (input || '').trim().toLowerCase()
  // Backward-compat aliases → current model ids
  if (!requested || requested === 'sonar' || requested === 'sonar-small' || requested === 'sonar-small-online') {
    return 'llama-3.1-sonar-small-128k-online'
  }
  if (requested === 'sonar-medium' || requested === 'sonar-medium-online' || requested === 'sonar-large') {
    return 'llama-3.1-sonar-large-128k-online'
  }
  if (requested.startsWith('llama-3.1-sonar')) {
    return requested
  }
  // Fallback to a safe default
  return 'llama-3.1-sonar-small-128k-online'
}

// Temporary hardcoded key - this should be removed in production
const HARDCODED_KEY = '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'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS allowance and preflight handling
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiKey = PERPLEXITY_API_KEY || HARDCODED_KEY

    if (!apiKey) {
      console.error('Perplexity API key not configured')
      return res.status(500).json({ error: 'Perplexity API key not configured' })
    }

    // Extract request body
    const { messages, model, temperature = 0.2, max_tokens = 4096 } = req.body

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
    const SERVER_TIMEOUT_MS = Number(process.env.PPLX_SERVER_TIMEOUT_MS || 50000)
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)

    const requestPayload = {
      model: normalizePerplexityModel(model || PERPLEXITY_MODEL),
      messages,
      temperature,
      max_tokens,
    }
    
    // Log request details for debugging
    console.log('Perplexity API request:', {
      url: `${PERPLEXITY_BASE_URL}/chat/completions`,
      model: requestPayload.model,
      messageCount: messages.length,
      temperature,
      max_tokens
    })
    
    const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: `Perplexity API error: ${response.statusText}`,
        details: errorText 
      })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Perplexity API handler timeout:', `Exceeded ${Number(process.env.PPLX_SERVER_TIMEOUT_MS || 50000)}ms`)
      return res.status(504).json({ 
        error: 'Upstream timeout',
        details: 'Perplexity request exceeded server timeout'
      })
    }
    console.error('Perplexity API handler error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
