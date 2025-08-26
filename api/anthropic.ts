import type { VercelRequest, VercelResponse } from '@vercel/node'

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      res.status(500).json({ error: 'Server not configured: ANTHROPIC_API_KEY missing' })
      return
    }

    const baseUrl = ((process.env.ANTHROPIC_BASE_URL || process.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim()).replace(/\/$/, '')
    const version = (process.env.ANTHROPIC_VERSION || '2023-06-01').trim()
    const defaultModel = (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()
    const defaultMax = Number(process.env.ANTHROPIC_MAX_TOKENS || process.env.VITE_ANTHROPIC_MAX_TOKENS) || 4096

    const rawBody: unknown = ((): unknown => {
      if (typeof req.body === 'string') return req.body
      if (Buffer.isBuffer(req.body)) return req.body.toString('utf-8')
      return req.body
    })()

    let body: any = {}
    if (typeof rawBody === 'string' && rawBody.length) {
      try {
        body = JSON.parse(rawBody)
      } catch {
        body = {}
      }
    } else if (rawBody && typeof rawBody === 'object') {
      body = rawBody
    }

    const payload = {
      model: body.model || defaultModel,
      temperature: body.temperature ?? 0.2,
      system: body.system,
      messages: body.messages,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : defaultMax,
    }

    // Server-side timeout below platform max
    const controller = new AbortController()
    const SERVER_TIMEOUT_MS = Number(process.env.ANTHROPIC_SERVER_TIMEOUT_MS || 115000)
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)

    const upstream = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': version,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const text = await upstream.text()
    // Pass through upstream status and a helpful error body for 4xx/5xx
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    if (!upstream.ok) {
      // eslint-disable-next-line no-console
      console.error('Anthropic upstream error:', upstream.status, text)
      res.send(text || JSON.stringify({ error: 'Anthropic upstream error', status: upstream.status }))
      return
    }
    res.send(text)
  } catch (err: any) {
    if (err instanceof Error && err.name === 'AbortError') {
      // eslint-disable-next-line no-console
      console.error('Anthropic proxy timeout:', `Exceeded ${Number(process.env.ANTHROPIC_SERVER_TIMEOUT_MS || 115000)}ms`)
      res.status(504).json({ error: 'Upstream timeout', detail: 'Anthropic request exceeded server timeout' })
      return
    }
    // eslint-disable-next-line no-console
    console.error('Anthropic proxy error', err)
    res.status(500).json({ error: 'Anthropic proxy error', detail: err?.message || String(err) })
  }
}


