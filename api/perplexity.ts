import type { VercelRequest, VercelResponse } from '@vercel/node'

// Get Perplexity configuration from environment
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.VITE_PERPLEXITY_API_KEY || ''
const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL || process.env.VITE_PERPLEXITY_BASE_URL || 'https://api.perplexity.ai'
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online'

// Temporary hardcoded key - this should be removed in production
const HARDCODED_KEY = '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'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Make request to Perplexity API
    const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || PERPLEXITY_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
    })

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
    console.error('Perplexity API handler error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
