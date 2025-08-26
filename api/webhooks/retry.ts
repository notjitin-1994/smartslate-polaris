import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client with service role
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const webhookSecret = process.env.WEBHOOK_SECRET || ''
const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173'

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  return `sha256=${hmac.digest('hex')}`
}

async function retryWebhookForReport(
  tableName: string,
  reportId: string,
  webhookType: 'prelim-report' | 'final-report' = 'prelim-report'
): Promise<{ success: boolean; error?: string; response?: any }> {
  if (!supabase || !webhookSecret) {
    return { success: false, error: 'Configuration missing' }
  }

  try {
    // Get the report data
    const { data: report, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !report) {
      return { success: false, error: `Report not found: ${fetchError?.message}` }
    }

    // Check if retry is allowed
    if (!report.webhook_job_id || report.webhook_attempts >= 3) {
      return { success: false, error: 'Retry not allowed (max attempts reached or no job ID)' }
    }

    // Construct webhook payload
    const payload = {
      job_id: report.webhook_job_id,
      report_id: reportId,
      report_type: tableName.replace('_reports', ''),
      research_report: report.research_report || '',
      research_status: report.research_status || 'completed',
      research_metadata: report.research_metadata || {},
      retry_attempt: true
    }

    // Call the webhook
    const payloadString = JSON.stringify(payload)
    const signature = generateWebhookSignature(payloadString, webhookSecret)
    const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/api/webhooks/${webhookType}`

    console.log(`Retrying webhook for ${tableName}:${reportId} -> ${webhookUrl}`)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Polaris-Webhook-Retry/1.0'
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Update failure status
      await supabase.rpc('update_webhook_status', {
        table_name: tableName,
        record_id: reportId,
        new_status: 'failed',
        response_data: { 
          error: responseData?.error || `HTTP ${response.status}`,
          retry_failed: true,
          failed_at: new Date().toISOString()
        },
        increment_attempts: true
      })

      return { 
        success: false, 
        error: `Webhook failed: HTTP ${response.status}`,
        response: responseData 
      }
    }

    // Update success status
    await supabase.rpc('update_webhook_status', {
      table_name: tableName,
      record_id: reportId,
      new_status: 'success',
      response_data: { 
        message: 'Retry successful',
        retry_completed: true,
        completed_at: new Date().toISOString()
      },
      increment_attempts: true
    })

    console.log(`Webhook retry succeeded for ${tableName}:${reportId}`)
    return { success: true, response: responseData }

  } catch (err: any) {
    const errorMessage = err?.message || 'Retry failed'
    console.error(`Webhook retry error for ${tableName}:${reportId}:`, errorMessage)

    // Update failure status
    try {
      await supabase.rpc('update_webhook_status', {
        table_name: tableName,
        record_id: reportId,
        new_status: 'failed',
        response_data: { 
          error: errorMessage,
          retry_failed: true,
          failed_at: new Date().toISOString()
        },
        increment_attempts: true
      })
    } catch (updateErr) {
      console.error('Failed to update retry failure status:', updateErr)
    }

    return { success: false, error: errorMessage }
  }
}

async function processFailedWebhooks(): Promise<{ processed: number; successes: number; failures: number; errors: string[] }> {
  if (!supabase) {
    return { processed: 0, successes: 0, failures: 0, errors: ['Database not configured'] }
  }

  try {
    // Get failed webhooks using the database function
    const { data: failedWebhooks, error } = await supabase.rpc('get_failed_webhooks', {
      max_attempts: 3,
      retry_after_minutes: 5
    })

    if (error) {
      return { processed: 0, successes: 0, failures: 0, errors: [error.message] }
    }

    if (!failedWebhooks || failedWebhooks.length === 0) {
      return { processed: 0, successes: 0, failures: 0, errors: [] }
    }

    let successes = 0
    let failures = 0
    const errors: string[] = []

    console.log(`Processing ${failedWebhooks.length} failed webhooks`)

    for (const webhook of failedWebhooks) {
      try {
        const result = await retryWebhookForReport(
          webhook.table_name,
          webhook.record_id,
          'prelim-report'
        )

        if (result.success) {
          successes++
        } else {
          failures++
          if (result.error) errors.push(`${webhook.table_name}:${webhook.record_id} - ${result.error}`)
        }

        // Small delay between retries to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err: any) {
        failures++
        errors.push(`${webhook.table_name}:${webhook.record_id} - ${err.message}`)
      }
    }

    console.log(`Webhook retry batch completed: ${successes} successes, ${failures} failures`)
    return { processed: failedWebhooks.length, successes, failures, errors }

  } catch (err: any) {
    return { processed: 0, successes: 0, failures: 0, errors: [err.message] }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  if (req.method === 'POST') {
    try {
      const { report_type, report_id, webhook_type = 'prelim-report' } = req.body

      if (!report_type || !report_id) {
        return res.status(400).json({ error: 'Missing required fields: report_type, report_id' })
      }

      const tableName = `${report_type}_reports`
      const result = await retryWebhookForReport(tableName, report_id, webhook_type)

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Webhook retry completed successfully',
          response: result.response
        })
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
          response: result.response
        })
      }

    } catch (err: any) {
      console.error('Webhook retry API error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'GET') {
    try {
      // Process all failed webhooks
      const result = await processFailedWebhooks()
      
      return res.status(200).json({
        success: true,
        message: 'Webhook retry batch completed',
        ...result
      })

    } catch (err: any) {
      console.error('Webhook batch retry error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
