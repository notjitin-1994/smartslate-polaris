import type { VercelRequest, VercelResponse } from '@vercel/node'

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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

  const apiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured: OPENAI_API_KEY missing' })
    return
  }

  try {
    const baseUrl = ((process.env.OPENAI_BASE_URL || process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')
    const defaultModel = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-5').trim()
    const defaultMax = Number(process.env.OPENAI_MAX_TOKENS || process.env.VITE_OPENAI_MAX_TOKENS) || 4096

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const payload = {
      model: body.model || defaultModel,
      temperature: body.temperature ?? 0.2,
      messages: body.messages,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : defaultMax,
    }

    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(text)
  } catch (err: any) {
    res.status(500).json({ error: 'OpenAI proxy error', detail: err?.message })
  }
}


