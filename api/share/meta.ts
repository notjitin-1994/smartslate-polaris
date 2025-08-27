import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (service role) to fetch public data
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Determine protocol correctly (fix dev HTTPS redirect to HTTP server)
    const host = String(req.headers.host || 'localhost:5173')
    const xfProto = String((req.headers['x-forwarded-proto'] as string) || '')
    const isLocalhost = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(host)
    const proto = xfProto || (isLocalhost ? 'http' : 'https')
    const base = `${proto}://${host}`
    const url = new URL(req.url || '', base)
    const id = url.searchParams.get('id') || ''
    const kind = (url.searchParams.get('kind') || 'summary').toLowerCase() as 'summary' | 'starmap'

    if (!id) {
      res.status(400).send('Missing id')
      return
    }

    // Defaults
    let userName = 'User'
    let starmapTitle = 'Untitled Starmap'
    let isPublic = false

    // Compute base/public URLs up front
    const siteBase = `${url.protocol}//${url.host}`
    let publicUrl = kind === 'starmap'
      ? `${siteBase}/report/public/starmap/${encodeURIComponent(id)}`
      : `${siteBase}/report/public/${encodeURIComponent(id)}`

    // If Supabase is available, enrich with real data; otherwise use defaults
    if (supabase) {
      if (kind === 'starmap') {
        const { data, error } = await supabase
          .from('starmap_jobs')
          .select('title, is_public, user_id')
          .eq('id', id)
          .single()

        if (data && !error) {
          isPublic = Boolean((data as any)?.is_public)
          starmapTitle = (data as any)?.title || starmapTitle
          if (data.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', data.user_id)
              .maybeSingle()
            userName = (profile as any)?.full_name || userName
          }
        }
      } else {
        const { data, error } = await supabase
          .from('polaris_summaries')
          .select('report_title, is_public, user_id, stage1_answers')
          .eq('id', id)
          .single()

        if (data && !error) {
          isPublic = Boolean((data as any)?.is_public)
          starmapTitle = (data as any)?.report_title || starmapTitle
          const stage1 = (data as any)?.stage1_answers
          if (stage1 && typeof stage1.requester_name === 'string' && stage1.requester_name.trim()) {
            userName = String(stage1.requester_name).trim()
          } else if (data.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', data.user_id)
              .maybeSingle()
            userName = (profile as any)?.full_name || userName
          }
        }
      }
    }

    // At this point, we have composed title and publicUrl regardless of DB

    const composedTitle = `Smartslate | Polaris | ${userName} | ${starmapTitle}`

    // Bot detection: serve meta for crawlers, redirect real users
    const ua = String(req.headers['user-agent'] || '').toLowerCase()
    const isBot = /bot|crawler|spider|facebook|twitter|slack|discord|linkedin|whatsapp|preview|embedly|quora|pinterest|reddit|google|bing|yahoo|duckduck|baidu|yandex|sogou|exabot|ia_archiver/.test(ua)

    if (!isBot) {
      // Explicit redirect for browsers to land on the final public page
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Location', publicUrl)
      res.status(302).send('Redirecting...')
      return
    }

    const html = `<!doctype html><html lang="en"><head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(composedTitle)}</title>
      <meta name="description" content="${escapeHtml(composedTitle)}" />
      <meta property="og:title" content="${escapeHtml(composedTitle)}" />
      <meta property="og:description" content="${escapeHtml(composedTitle)}" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="${escapeHtml(publicUrl)}" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="${escapeHtml(composedTitle)}" />
      <meta name="twitter:description" content="${escapeHtml(composedTitle)}" />
      <meta name="robots" content="noindex, nofollow" />
      <meta http-equiv="refresh" content="0;url=${escapeHtml(publicUrl)}" />
    </head><body></body></html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (err) {
    res.status(500).send('Internal error')
  }
}


