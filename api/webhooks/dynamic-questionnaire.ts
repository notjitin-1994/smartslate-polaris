import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const webhookSecret = process.env.WEBHOOK_SECRET || ''

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

interface DynamicWebhookPayload {
  job_id: string
  summary_id: string
  questionnaire: any
  status: 'completed' | 'failed'
  metadata?: Record<string, any>
  error?: string
}

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature')
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false
  const signatureParts = signature.split('=')
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') return false
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signatureParts[1], 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook not properly configured' })
  }

  let payload: DynamicWebhookPayload
  let rawBody: string

  try {
    rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' })
  }

  const signature = req.headers['x-webhook-signature'] as string
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  if (!payload.job_id || !payload.summary_id || !payload.status) {
    return res.status(400).json({ error: 'Missing required fields: job_id, summary_id, status' })
  }

  try {
    const questionnaireString = typeof payload.questionnaire === 'string' 
      ? payload.questionnaire
      : JSON.stringify(payload.questionnaire)

    const { error } = await supabase
      .from('polaris_summaries')
      .update({ 
        dynamic_questionnaire_report: questionnaireString
      })
      .eq('id', payload.summary_id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      message: 'Dynamic questionnaire updated successfully',
      summary_id: payload.summary_id,
      job_id: payload.job_id,
      status: payload.status,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update dynamic questionnaire' })
  }
}


