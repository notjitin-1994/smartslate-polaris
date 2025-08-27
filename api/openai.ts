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
    // Use a valid default model
    const defaultModel = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim()
    const defaultMax = Number(process.env.OPENAI_MAX_TOKENS || process.env.VITE_OPENAI_MAX_TOKENS) || 4096

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    // Normalize requested max tokens: accept max_completion_tokens, max_output_tokens, or max_tokens
    const requestedMax = ((): number => {
      const c1 = Number((body as any).max_completion_tokens)
      if (Number.isFinite(c1) && c1 > 0) return c1
      const c2 = Number((body as any).max_output_tokens)
      if (Number.isFinite(c2) && c2 > 0) return c2
      const c3 = Number((body as any).max_tokens)
      if (Number.isFinite(c3) && c3 > 0) return c3
      return defaultMax
    })()
    const payload = {
      model: body.model || defaultModel,
      temperature: body.temperature ?? 0.2,
      messages: body.messages,
      max_tokens: requestedMax,
    }

    // Helpers for Responses API
    function messagesToPrompt(messages: any[]): string {
      if (!Array.isArray(messages)) return ''
      return messages
        .map((m) => {
          const role = (m?.role || '').toString().toUpperCase()
          const content = typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content ?? '')
          return `${role}: ${content}`
        })
        .join('\n\n')
    }

    async function callResponsesDirect(): Promise<{ status: number; body: string }> {
      const inputText = messagesToPrompt(payload.messages || [])
      const responsesPayload: any = {
        model: payload.model,
        input: inputText,
      }
      if (typeof payload.max_tokens === 'number') {
        ;(responsesPayload as any).max_output_tokens = payload.max_tokens
        ;(responsesPayload as any).max_completion_tokens = payload.max_tokens
      }
      if (typeof payload.temperature === 'number') {
        responsesPayload.temperature = payload.temperature
      }

      const resp = await fetch(`${baseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(responsesPayload),
      })

      const raw = await resp.text()
      if (!resp.ok) {
        return { status: resp.status, body: raw }
      }

      try {
        const data = JSON.parse(raw)
        const outputText = data?.output_text
          || data?.response?.output_text
          || (Array.isArray(data?.output)
                ? data.output.map((o: any) => Array.isArray(o?.content)
                    ? o.content.map((c: any) => c?.text || c?.content || '').join('')
                    : o?.content?.text || '').join('\n').trim()
                : '')
        const normalized = {
          id: data?.id,
          object: 'chat.completion',
          created: data?.created || Math.floor(Date.now() / 1000),
          model: data?.model || payload.model,
          choices: [
            { index: 0, message: { role: 'assistant', content: outputText || '' }, finish_reason: 'stop' },
          ],
        }
        return { status: 200, body: JSON.stringify(normalized) }
      } catch {
        return { status: 200, body: raw }
      }
    }

    // If model requires Responses API (e.g., gpt-5, o1, o3, omni), route directly
    const modelLower = String(payload.model || '').toLowerCase()
    if (modelLower.startsWith('gpt-5') || modelLower.startsWith('o1') || modelLower.startsWith('o3') || modelLower.includes('omni')) {
      const resp = await callResponsesDirect()
      res.status(resp.status)
      res.setHeader('Content-Type', 'application/json')
      res.send(resp.body)
      return
    }

    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    let text = await upstream.text()
    // If chat.completions rejected unsupported parameters (e.g., max_tokens), try Responses API
    if (!upstream.ok) {
      let shouldFallback = false
      try {
        const err = JSON.parse(text)
        const msg = err?.error?.message || err?.message || ''
        const code = err?.error?.code || err?.code || ''
        if ((/unsupported_parameter/i.test(msg) || /unsupported_parameter/i.test(code)) && /max_tokens/i.test(msg + code)) {
          shouldFallback = true
        }
        const m = String((payload as any).model || '').toLowerCase()
        if (m.startsWith('o1') || m.startsWith('o3') || m.startsWith('gpt-5') || m.includes('omni')) {
          shouldFallback = true
        }
      } catch {}

      if (shouldFallback) {
        const resp = await callResponsesDirect()
        res.status(resp.status)
        res.setHeader('Content-Type', 'application/json')
        res.send(resp.body)
        return
      }
    }

    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    if (!upstream.ok) {
      // eslint-disable-next-line no-console
      console.error('OpenAI upstream error:', upstream.status, text)
      res.send(text || JSON.stringify({ error: 'OpenAI upstream error', status: upstream.status }))
      return
    }
    res.send(text)
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('OpenAI proxy error:', err)
    res.status(500).json({ error: 'OpenAI proxy error', detail: err?.message })
  }
}


