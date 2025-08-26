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

interface WebhookPayload {
  job_id: string
  report_id: string
  report_type: 'greeting' | 'org' | 'requirement'
  research_report: string
  research_status: 'completed' | 'failed'
  research_metadata?: Record<string, any>
  error?: string
  final_data?: Record<string, any>  // Additional final report specific data
}

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature')
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) {
    return false
  }

  // Extract signature from header (format: "sha256=<hash>")
  const signatureParts = signature.split('=')
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signatureParts[1], 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

function getReportTableFromType(type: string): string | null {
  const t = String(type).toLowerCase()
  if (t === 'greeting') return 'greeting_reports'
  if (t === 'org' || t === 'organization') return 'org_reports'
  if (t === 'requirement' || t === 'requirements') return 'requirement_reports'
  return null
}

async function auditWebhookCall(
  jobId: string,
  reportId: string | null,
  reportTable: string | null,
  payload: any,
  responseStatus: number,
  responseBody: any,
  errorMessage: string | null,
  attemptNumber: number
) {
  if (!supabase) return

  try {
    await supabase
      .from('webhook_audit')
      .insert({
        webhook_type: 'final-report',
        job_id: jobId,
        report_id: reportId || null,
        report_table: reportTable,
        request_payload: payload,
        response_status: responseStatus,
        response_body: responseBody,
        error_message: errorMessage,
        attempt_number: attemptNumber
      })
  } catch (err) {
    console.error('Failed to audit webhook call:', err)
  }
}

async function updateReportWithFinalResult(
  reportTable: string,
  reportId: string,
  jobId: string,
  researchReport: string,
  researchStatus: 'completed' | 'failed',
  researchMetadata: Record<string, any> = {},
  finalData: Record<string, any> = {},
  errorMessage?: string
) {
  if (!supabase) {
    throw new Error('Database not configured')
  }

  const updateData: any = {
    research_report: researchReport,
    research_status: researchStatus,
    research_metadata: {
      ...researchMetadata,
      ...finalData,
      webhook_updated: true,
      webhook_timestamp: new Date().toISOString(),
      webhook_type: 'final-report',
      job_id: jobId
    },
    webhook_status: 'success',
    webhook_job_id: jobId,
    webhook_last_attempt: new Date().toISOString()
  }

  if (errorMessage) {
    updateData.research_metadata.error = errorMessage
    updateData.webhook_status = 'failed'
  }

  // For final reports, we might want to set additional completion flags
  if (researchStatus === 'completed') {
    updateData.research_metadata.final_completion = new Date().toISOString()
    updateData.research_metadata.processing_stage = 'final'
  }

  const { data, error } = await supabase
    .from(reportTable)
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    console.error(`Failed to update ${reportTable}:`, error)
    throw error
  }

  return data
}

async function notifyReportCompletion(reportId: string, reportType: string, jobId: string) {
  // This function can be extended to send notifications, trigger other workflows, etc.
  // For now, we'll just log the completion
  console.log(`Final report completed: ${reportType} report ${reportId} from job ${jobId}`)
  
  // Future implementations could:
  // - Send email notifications
  // - Update user dashboards
  // - Trigger downstream processes
  // - Generate report summaries
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if database is configured
  if (!supabase) {
    console.error('Database not initialized for webhook')
    return res.status(500).json({ error: 'Database not configured' })
  }

  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET not configured')
    return res.status(500).json({ error: 'Webhook not properly configured' })
  }

  let payload: WebhookPayload
  let rawBody: string

  try {
    // Parse the request body
    rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch (err) {
    await auditWebhookCall('unknown', null, null, req.body, 400, { error: 'Invalid JSON' }, 'Invalid JSON payload', 1)
    return res.status(400).json({ error: 'Invalid JSON payload' })
  }

  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'] as string
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    await auditWebhookCall(payload.job_id || 'unknown', payload.report_id || null, null, payload, 401, { error: 'Invalid signature' }, 'Invalid webhook signature', 1)
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  // Validate required fields
  if (!payload.job_id || !payload.report_id || !payload.report_type) {
    await auditWebhookCall(payload.job_id || 'unknown', payload.report_id || null, null, payload, 400, { error: 'Missing required fields' }, 'Missing required fields', 1)
    return res.status(400).json({ error: 'Missing required fields: job_id, report_id, report_type' })
  }

  const reportTable = getReportTableFromType(payload.report_type)
  if (!reportTable) {
    await auditWebhookCall(payload.job_id, payload.report_id, null, payload, 400, { error: 'Invalid report type' }, 'Invalid report type', 1)
    return res.status(400).json({ error: `Invalid report_type: ${payload.report_type}` })
  }

  try {
    // Check if the report exists and get current status
    const { data: existingReport, error: fetchError } = await supabase
      .from(reportTable)
      .select('id, user_id, webhook_status, webhook_attempts, research_status')
      .eq('id', payload.report_id)
      .single()

    if (fetchError || !existingReport) {
      await auditWebhookCall(payload.job_id, payload.report_id, reportTable, payload, 404, { error: 'Report not found' }, 'Report not found', 1)
      return res.status(404).json({ error: 'Report not found' })
    }

    // Check if this final webhook was already processed successfully
    if (existingReport.webhook_status === 'success' && existingReport.research_status === 'completed') {
      await auditWebhookCall(payload.job_id, payload.report_id, reportTable, payload, 200, { message: 'Already processed' }, null, (existingReport.webhook_attempts || 0) + 1)
      return res.status(200).json({ 
        message: 'Final webhook already processed successfully', 
        report_id: payload.report_id,
        status: 'already_completed'
      })
    }

    // Update the report with the final research data
    const updatedReport = await updateReportWithFinalResult(
      reportTable,
      payload.report_id,
      payload.job_id,
      payload.research_report || '',
      payload.research_status || 'completed',
      payload.research_metadata || {},
      payload.final_data || {},
      payload.error
    )

    // Update the webhook status with success
    await supabase.rpc('update_webhook_status', {
      table_name: reportTable,
      record_id: payload.report_id,
      new_status: 'success',
      response_data: { 
        message: 'Final report updated successfully',
        completed_at: new Date().toISOString(),
        processing_stage: 'final'
      },
      increment_attempts: true
    })

    // Trigger completion notifications
    if (payload.research_status === 'completed') {
      await notifyReportCompletion(payload.report_id, payload.report_type, payload.job_id)
    }

    // Audit the successful webhook call
    await auditWebhookCall(
      payload.job_id, 
      payload.report_id, 
      reportTable, 
      payload, 
      200, 
      { message: 'Final report updated successfully', report: updatedReport },
      null,
      (existingReport.webhook_attempts || 0) + 1
    )

    console.log(`Successfully processed final-report webhook for job ${payload.job_id}, report ${payload.report_id}`)

    return res.status(200).json({
      message: 'Final report updated successfully',
      report_id: payload.report_id,
      job_id: payload.job_id,
      report_type: payload.report_type,
      status: payload.research_status,
      timestamp: new Date().toISOString(),
      processing_stage: 'final'
    })

  } catch (err: any) {
    const errorMessage = err?.message || 'Internal server error'
    console.error(`Final-report webhook error for job ${payload.job_id}:`, err)

    // Update webhook status with failure
    try {
      await supabase.rpc('update_webhook_status', {
        table_name: reportTable,
        record_id: payload.report_id,
        new_status: 'failed',
        response_data: { 
          error: errorMessage,
          failed_at: new Date().toISOString(),
          processing_stage: 'final'
        },
        increment_attempts: true
      })
    } catch (updateErr) {
      console.error('Failed to update webhook status:', updateErr)
    }

    // Audit the failed webhook call
    await auditWebhookCall(payload.job_id, payload.report_id, reportTable, payload, 500, { error: errorMessage }, errorMessage, 1)

    return res.status(500).json({ 
      error: 'Failed to process final report webhook',
      message: errorMessage,
      job_id: payload.job_id,
      report_id: payload.report_id
    })
  }
}
