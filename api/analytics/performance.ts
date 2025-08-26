import type { VercelRequest, VercelResponse } from '@vercel/node'

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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

  try {
    // Best-effort parse to avoid throwing on invalid JSON
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    // eslint-disable-next-line no-console
    console.log('Performance metrics received', {
      url: (body as any)?.url,
      ts: (body as any)?.timestamp,
    })
    // Intentionally drop data. Future: persist to DB or analytics pipeline.
    res.status(204).end()
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Analytics endpoint error:', err)
    res.status(204).end() // never block page load with analytics failures
  }
}


