import type { VercelRequest, VercelResponse } from '@vercel/node'

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured: ANTHROPIC_API_KEY missing' })
    return
  }

  try {
    const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
    const version = process.env.ANTHROPIC_VERSION || '2023-06-01'
    const defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'
    const defaultMax = Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const payload = {
      model: body.model || defaultModel,
      temperature: body.temperature ?? 0.2,
      system: body.system,
      messages: body.messages,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : defaultMax,
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

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(text)
  } catch (err: any) {
    res.status(500).json({ error: 'Anthropic proxy error', detail: err?.message })
  }
}


