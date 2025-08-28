import type { VercelRequest, VercelResponse } from '@vercel/node'

// Placeholder for perplexity API endpoint
// This file is referenced in vite.config.ts

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not implemented' })
}
