import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client with service role for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const webhookSecret = process.env.WEBHOOK_SECRET || ''
const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173'
const webhookTimeoutMs = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000')
const webhookMaxRetries = parseInt(process.env.WEBHOOK_MAX_RETRIES || '3')

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key')
}

function generateWebhookSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  return `sha256=${hmac.digest('hex')}`
}

// ---------- Dynamic Questionnaire Helpers ----------

type ProviderMeta = {
  id?: string
  finish_reason?: string
  stop_reason?: string
  usage?: any
}

async function callAnthropicMessages(payload: {
  model: string
  temperature: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  max_tokens: number
  response_format?: any
}): Promise<{ ok: boolean; content?: string; status?: number; error?: string; meta?: ProviderMeta }> {
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim()
    const baseUrl = ((process.env.ANTHROPIC_BASE_URL || process.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim()).replace(/\/$/, '')
    const version = (process.env.ANTHROPIC_VERSION || '2023-06-01').trim()
    if (!apiKey) return { ok: false, error: 'Anthropic API key not configured' }

    const controller = new AbortController()
    const SERVER_TIMEOUT_MS = Number(process.env.ANTHROPIC_SERVER_TIMEOUT_MS || 115000)
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)

    const maxAttempts = Math.max(1, Number(process.env.ANTHROPIC_RETRIES || 2))
    const baseDelayMs = Math.max(200, Number(process.env.ANTHROPIC_RETRY_BASE_DELAY_MS || 500))
    let lastStatus = 0
    let lastText = ''

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': version,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        const text = await resp.text()
        lastStatus = resp.status
        lastText = text
        if (resp.ok) {
          try {
            const data: any = JSON.parse(text)
            const stopReason = data?.stop_reason
            if (stopReason && stopReason === 'max_tokens') {
              return { ok: false, status: 507, error: 'Truncated output from Anthropic (max_tokens). Reduce inputs and try again.' }
            }
            const content = Array.isArray(data?.content) ? (data.content.find((c: any) => c.type === 'text')?.text || '') : (data?.content || '')
            clearTimeout(timeoutId)
            return { ok: true, content, meta: { id: data?.id, stop_reason: stopReason, usage: data?.usage } }
          } catch {
            clearTimeout(timeoutId)
            return { ok: true, content: text }
          }
        }

        // Overload or retryable conditions
        const shouldRetry = resp.status === 529 || resp.status === 503 || resp.headers.get('x-should-retry') === 'true'
        if (shouldRetry && attempt < maxAttempts - 1) {
          const jitter = Math.random() * baseDelayMs
          const backoff = baseDelayMs * Math.pow(2, attempt) + jitter
          await new Promise(r => setTimeout(r, backoff))
          continue
        }

        break
      } catch (e) {
        if (attempt < maxAttempts - 1) {
          const jitter = Math.random() * baseDelayMs
          const backoff = baseDelayMs * Math.pow(2, attempt) + jitter
          await new Promise(r => setTimeout(r, backoff))
          continue
        }
        clearTimeout(timeoutId)
        return { ok: false, error: (e as any)?.message || 'Anthropic request failed' }
      }
    }

    clearTimeout(timeoutId)
    return { ok: false, status: lastStatus, error: lastText || `HTTP ${lastStatus}` }
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'Anthropic request timed out' : (err?.message || 'Anthropic request failed')
    return { ok: false, error: msg }
  }
}

// ---------- OpenAI Helper ----------
async function callOpenAIChat(payload: {
  model: string
  temperature: number
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  max_tokens: number
  response_format?: any
}): Promise<{ ok: boolean; content?: string; status?: number; error?: string; meta?: ProviderMeta }> {
  try {
    const apiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim()
    const baseUrl = ((process.env.OPENAI_BASE_URL || process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')
    if (!apiKey) return { ok: false, error: 'OpenAI API key not configured' }

    const controller = new AbortController()
    const SERVER_TIMEOUT_MS = Number(process.env.OPENAI_SERVER_TIMEOUT_MS || 75000)
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS)

    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const text = await resp.text()
    if (!resp.ok) return { ok: false, status: resp.status, error: text || `HTTP ${resp.status}` }

    try {
      const data: any = JSON.parse(text)
      const choice = data?.choices?.[0]
      const content = choice?.message?.content || ''
      const finishReason = choice?.finish_reason
      if (finishReason && (finishReason === 'length' || finishReason === 'max_tokens')) {
        return { ok: false, status: 507, error: 'Truncated output from OpenAI (length/max_tokens). Reduce inputs and try again.' }
      }
      if (!content) {
        return { ok: false, status: 500, error: 'Empty content from OpenAI' }
      }
      return { ok: true, content, meta: { id: data?.id, finish_reason: finishReason, usage: data?.usage } }
    } catch {
      return { ok: true, content: text }
    }
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'OpenAI request timed out' : (err?.message || 'OpenAI request failed')
    return { ok: false, error: msg }
  }
}

function cleanAndParseJson<T = any>(raw: string): T {
  const cleaned = (raw || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  return JSON.parse(cleaned) as T
}

async function buildDynamicQuestionnairePrompt(summaryId: string): Promise<string> {
  if (!supabase) return ''
  // Pull context from summary
  const { data: s } = await supabase
    .from('polaris_summaries')
    .select('company_name, prelim_report, greeting_report, org_report, requirement_report, stage1_answers, stage2_answers, stage3_answers')
    .eq('id', summaryId)
    .single()

  const prelim = (s as any)?.prelim_report || ''
  const greeting = (s as any)?.greeting_report || ''
  const org = (s as any)?.org_report || ''
  const req = (s as any)?.requirement_report || ''
  const stage1 = JSON.stringify((s as any)?.stage1_answers || {})
  const stage2 = JSON.stringify((s as any)?.stage2_answers || {})
  const stage3 = JSON.stringify((s as any)?.stage3_answers || {})

  return [
    'You are designing a dynamic questionnaire to gather deeper insights for a Learning Needs Analysis. Return ONLY valid JSON.',
    'JSON schema:',
    '{ "stages": [ { "id": "stage_1", "title": "string", "description": "string?", "questions": [',
    '{ "id": "string", "type": "text|textarea|single_select|multi_select|slider|number|calendar_date|calendar_range|boolean", "label": "string", "help?": "string", "required?": true, "options?": [{"value":"","label":""}] } ] } ] }',
    'Constraints:',
    '- 2 to 4 stages. Each stage 6-9 questions. Avoid duplicates. Make questions actionable and varied.',
    '- Use prior answers and reports to tailor focus areas.',
    `Company: ${(s as any)?.company_name || ''}`,
    `Stage 1 answers: ${stage1}`,
    `Stage 2 answers: ${stage2}`,
    `Stage 3 answers: ${stage3}`,
    'Reports context below to inform questions:',
    `Preliminary Report:\n${prelim}`,
    `Greeting Report:\n${greeting}`,
    `Organization Report:\n${org}`,
    `Requirements Report:\n${req}`,
  ].join('\n\n')
}

async function generateDynamicQuestionnaire(summaryId: string): Promise<{ stagesJson: string; stagesObj: any }> {
  const system = 'You are an expert learning designer. Produce concise, high-quality JSON only.'
  const prompt = await buildDynamicQuestionnairePrompt(summaryId)

  const model = (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()
  const contextLimit = Number(process.env.VITE_ANTHROPIC_CONTEXT || 200000)
  const desiredMax = Number(process.env.VITE_MAX_OUTPUT_TOKENS || 8096)
  const reserve = 512
  const approxTokens = (s: string) => Math.ceil((s || '').length / 4)
  const inputTokens = [system, prompt].reduce((n, s) => n + approxTokens(s), 0)
  const headroom = Math.max(0, contextLimit - inputTokens - reserve)
  const computedMax = Math.max(0, Math.min(desiredMax, headroom))
  if (computedMax < 1024) {
    throw new Error('Payload too large for model context; reduce inputs and try again')
  }

  const result = await callAnthropicMessages({
    model,
    temperature: 0.6,
    system,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: computedMax,
    // Avoid response_format for Anthropic Messages to prevent extra inputs error
  })

  if (!result.ok || !result.content) {
    throw new Error(result.error || 'Dynamic questionnaire generation failed')
  }

  // Ensure JSON shape
  const parsed = cleanAndParseJson<any>(result.content)
  const stagesArray = Array.isArray(parsed?.stages) ? parsed.stages : parsed
  const safe = { stages: stagesArray }
  return { stagesJson: JSON.stringify(safe), stagesObj: safe }
}

async function notifyDynamicQuestionnaire(
  jobId: string,
  summaryId: string,
  questionnaire: any,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<{ success: boolean; usedWebhook: boolean; error?: string }> {
  const payload = {
    job_id: jobId,
    summary_id: summaryId,
    questionnaire,
    status,
    ...(errorMessage && { error: errorMessage })
  }

  const webhookResult = await callWebhook('dynamic-questionnaire', payload)
  if (webhookResult.success) return { success: true, usedWebhook: true }

  // Fallback: direct DB update
  if (!supabase) return { success: false, usedWebhook: false, error: webhookResult.error }
  try {
    const questionnaireString = typeof questionnaire === 'string' ? questionnaire : JSON.stringify(questionnaire)
    const { error } = await supabase
      .from('polaris_summaries')
      .update({ dynamic_questionnaire_report: questionnaireString })
      .eq('id', summaryId)
    if (error) {
      return { success: false, usedWebhook: false, error: error.message }
    }
    return { success: true, usedWebhook: false }
  } catch (e: any) {
    return { success: false, usedWebhook: false, error: e?.message || webhookResult.error }
  }
}

async function callWebhook(
  endpoint: string,
  payload: any,
  retryAttempt: number = 0
): Promise<{ success: boolean; response?: any; error?: string }> {
  if (!webhookSecret) {
    return { success: false, error: 'Webhook secret not configured' }
  }

  try {
    const payloadString = JSON.stringify(payload)
    const signature = generateWebhookSignature(payloadString, webhookSecret)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), webhookTimeoutMs)
    
    const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/${endpoint}`
    
    console.log(`Calling webhook ${webhookUrl} (attempt ${retryAttempt + 1}/${webhookMaxRetries + 1})`)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Polaris-Webhook/1.0'
      },
      body: payloadString,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`Webhook ${webhookUrl} succeeded on attempt ${retryAttempt + 1}`)
    
    return { success: true, response: responseData }
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown webhook error'
    console.error(`Webhook ${endpoint} failed (attempt ${retryAttempt + 1}):`, errorMessage)
    
    // Retry with exponential backoff
    if (retryAttempt < webhookMaxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000)
      console.log(`Retrying webhook ${endpoint} in ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return callWebhook(endpoint, payload, retryAttempt + 1)
    }
    
    return { success: false, error: errorMessage }
  }
}

async function notifyReportCompletion(
  jobId: string,
  reportId: string,
  reportType: string,
  researchReport: string,
  researchStatus: 'completed' | 'failed',
  researchMetadata: Record<string, any>,
  errorMessage?: string
): Promise<{ success: boolean; usedWebhook: boolean; error?: string }> {
  const payload = {
    job_id: jobId,
    report_id: reportId,
    report_type: reportType,
    research_report: researchReport,
    research_status: researchStatus,
    research_metadata: researchMetadata,
    ...(errorMessage && { error: errorMessage })
  }

  // Try webhook first
  const webhookResult = await callWebhook('prelim-report', payload)
  
  if (webhookResult.success) {
    return { success: true, usedWebhook: true }
  }

  // Fallback to direct database update if webhook fails
  console.warn(`Webhook failed for job ${jobId}, falling back to direct database update`)
  return { success: false, usedWebhook: false, error: webhookResult.error }
}

async function directDatabaseUpdate(
  jobId: string,
  reportId: string,
  reportTable: string,
  researchReport: string,
  researchStatus: 'completed' | 'failed',
  researchMetadata: Record<string, any>,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  try {
    const updateData: any = {
      research_report: researchReport,
      research_status: researchStatus,
      research_metadata: {
        ...researchMetadata,
        job_id: jobId,
        fallback_update: true,
        webhook_failed: true,
        updated_at: new Date().toISOString()
      },
      webhook_status: 'failed'
    }

    if (errorMessage) {
      updateData.research_metadata.error = errorMessage
    }

    const { error } = await supabase
      .from(reportTable)
      .update(updateData)
      .eq('id', reportId)

    if (error) {
      console.error(`Direct database update failed for ${reportTable}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`Direct database update succeeded for job ${jobId}, report ${reportId}`)
    return { success: true }
  } catch (err: any) {
    const errorMsg = err?.message || 'Database update failed'
    console.error(`Direct database update error for job ${jobId}:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

function normalizePerplexityModel(input?: string): string {
  const requested = (input || '').trim().toLowerCase()
  const canonical = new Set(['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'])
  if (canonical.has(requested)) return requested
  const normalized = requested.replace(/\s+/g, '-').replace(/_/g, '-')
  if (canonical.has(normalized)) return normalized
  if (requested === 'sonar pro' || requested === 'sonar-large') return 'sonar-pro'
  if (requested === 'sonar reasoning') return 'sonar-reasoning'
  if (requested === 'sonar reasoning pro') return 'sonar-reasoning-pro'
  if (requested.startsWith('llama-3.1-sonar-small')) return 'sonar'
  if (requested.startsWith('llama-3.1-sonar-large')) return 'sonar-pro'
  return 'sonar'
}

function getReportTableFromType(type?: string): string | null {
  if (!type) return null
  const t = String(type).toLowerCase()
  if (t === 'greeting') return 'greeting_reports'
  if (t === 'org' || t === 'organization') return 'org_reports'
  if (t === 'requirement' || t === 'requirements') return 'requirement_reports'
  return null
}

async function runJob(jobId: string, prompt: string, model?: string, temperature: number = 0.2, _max_tokens: number = 2600) {
  if (!supabase) {
    console.error('Supabase not initialized')
    return
  }

  try {
    // Read job metadata to know which report row to update
    const { data: jobRow } = await supabase
      .from('report_jobs')
      .select('metadata, summary_id, user_id')
      .eq('job_id', jobId)
      .single()

    const reportType = (jobRow as any)?.metadata?.report_type as string | undefined
    const reportId = (jobRow as any)?.metadata?.report_id as string | undefined
    const reportTable = getReportTableFromType(reportType)
    const summaryIdForDynamic = (jobRow as any)?.summary_id as string | undefined

    // Update job status to running
    const { error: updateError } = await supabase
      .from('report_jobs')
      .update({ 
        status: 'running', 
        percent: 5,
        started_at: new Date().toISOString()
      })
      .eq('job_id', jobId)

    if (updateError) {
      console.error(`Failed to update job ${jobId} to running:`, updateError)
      return
    }

    // Also reflect running state in the target report row if provided
    if (reportTable && reportId) {
      await supabase
        .from(reportTable)
        .update({
          research_status: 'running',
          research_metadata: {
            ...(jobRow as any)?.metadata,
            job_id: jobId,
            model: model || process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar-pro',
            started_at: new Date().toISOString(),
          }
        })
        .eq('id', reportId)
    }

    // Branch 1: Dynamic questionnaire job
    if (String(reportType).toLowerCase() === 'dynamic_questionnaire' || (!reportTable && summaryIdForDynamic)) {
      // Progress update for dynamic generation
      await supabase
        .from('report_jobs')
        .update({ percent: 20, eta_seconds: 90 })
        .eq('job_id', jobId)

      const { stagesJson, stagesObj } = await generateDynamicQuestionnaire(summaryIdForDynamic || '')

      // Mark job success
      await supabase
        .from('report_jobs')
        .update({ status: 'succeeded', result: stagesJson, percent: 100, eta_seconds: 0, completed_at: new Date().toISOString() })
        .eq('job_id', jobId)

      // Deliver via webhook (or fallback DB update)
      await notifyDynamicQuestionnaire(jobId, summaryIdForDynamic || '', stagesObj, 'completed')
      return
    }

    // Branch 2: Research report job (single-provider policy)
    const mdl = normalizePerplexityModel(model || process.env.PERPLEXITY_MODEL || process.env.VITE_PERPLEXITY_MODEL || 'sonar-pro')

    // Compose user message with a short preamble as Perplexity lacks system role (kept for reference)
    // const contextualPrompt = `You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.\n\n${prompt}`

    // Update progress and ETA baseline
    {
      const isReasoningModel = mdl.includes('reasoning')
      const baseTimeout = Number(process.env.PPLX_SERVER_TIMEOUT_MS || 75000)
      const SERVER_TIMEOUT_MS = isReasoningModel ? Math.min(110000, Math.floor(baseTimeout * 1.5)) : baseTimeout
      await supabase
        .from('report_jobs')
        .update({ percent: 15, eta_seconds: Math.ceil(SERVER_TIMEOUT_MS / 1000) })
        .eq('job_id', jobId)
    }

    let content = ''
    let providerUsed: 'openai' | 'anthropic' = (process.env.VITE_LLM_PROVIDER as any)?.includes('openai') ? 'openai' : 'anthropic'
    const openaiPreferred = providerUsed === 'openai'

    // Compute dynamic max tokens
    const approxTokens = (s: string) => Math.ceil((s || '').length / 4)
    const inputMessagesOpenAI = [
      { role: 'system', content: 'You are a helpful research assistant. Provide comprehensive, accurate information. Cite sources if known.' },
      { role: 'user', content: prompt }
    ]
    const inputTextOpenAI = inputMessagesOpenAI.map(m => m.content).join('\n\n')
    const inputTokensOpenAI = approxTokens(inputTextOpenAI)
    const openaiContext = Number(process.env.VITE_OPENAI_CONTEXT || 128000)
    const desiredMax = Number(process.env.VITE_MAX_OUTPUT_TOKENS || 8096)
    const reserve = 512
    const openaiMaxOut = Math.max(0, Math.min(desiredMax, Math.max(0, openaiContext - inputTokensOpenAI - reserve)))
    if (openaiPreferred && openaiMaxOut < 1024) {
      throw new Error('Payload too large for OpenAI context; reduce inputs and try again')
    }

    const anthropicSystem = 'You are a helpful research assistant. Provide comprehensive, accurate information based on your knowledge. Cite sources if known.'
    const inputTextAnthropic = `${anthropicSystem}\n\n${prompt}`
    const anthropicContext = Number(process.env.VITE_ANTHROPIC_CONTEXT || 200000)
    const anthropicMaxOut = Math.max(0, Math.min(desiredMax, Math.max(0, anthropicContext - approxTokens(inputTextAnthropic) - reserve)))
    if (!openaiPreferred && anthropicMaxOut < 1024) {
      throw new Error('Payload too large for Anthropic context; reduce inputs and try again')
    }

    let providerRequestId: string | undefined
    let finishReason: string | undefined
    let stopReason: string | undefined
    const callStartedAt = Date.now()

    if (openaiPreferred) {
      const openaiModel = (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim()
      const openaiResult = await callOpenAIChat({
        model: openaiModel,
        temperature: typeof temperature === 'number' ? temperature : 0.2,
        messages: inputMessagesOpenAI as any,
        max_tokens: openaiMaxOut,
      })
      if (!openaiResult.ok) throw new Error(openaiResult.error || 'OpenAI call failed')
      content = (openaiResult.content || '').trim()
      providerUsed = 'openai'
      providerRequestId = openaiResult.meta?.id
      finishReason = openaiResult.meta?.finish_reason
    } else {
      const anthropicModel = (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()
      const anthropic = await callAnthropicMessages({
        model: anthropicModel,
        temperature: typeof temperature === 'number' ? temperature : 0.2,
        system: anthropicSystem,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: anthropicMaxOut,
      })
      if (!anthropic.ok) throw new Error(anthropic.error || 'Anthropic call failed')
      content = (anthropic.content || '').trim()
      providerUsed = 'anthropic'
      providerRequestId = anthropic.meta?.id
      stopReason = anthropic.meta?.stop_reason
    }
    const callEndedAt = Date.now()
    const latencyMs = callEndedAt - callStartedAt

    // Update progress
    await supabase
      .from('report_jobs')
      .update({ percent: 80 })
      .eq('job_id', jobId)

    // Update job with result
    {
      const { error: completeError } = await supabase
        .from('report_jobs')
        .update({
          status: 'succeeded',
          result: content,
          percent: 100,
          eta_seconds: 0,
          completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
      if (completeError) {
        console.error(`Failed to complete job ${jobId}:`, completeError)
      }
    }

    // Notify report completion via webhook
    if (reportTable && reportId && reportType) {
      const researchMetadata = {
        ...(jobRow as any)?.metadata,
        job_id: jobId,
        model: providerUsed === 'openai' ? (process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim() : (process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim(),
        completed_at: new Date().toISOString(),
        provider: providerUsed,
        provider_request_id: providerRequestId,
        input_token_estimate: openaiPreferred ? inputTokensOpenAI : approxTokens(inputTextAnthropic),
        max_output_tokens: openaiPreferred ? openaiMaxOut : anthropicMaxOut,
        finish_reason: finishReason,
        stop_reason: stopReason,
        latency_ms: latencyMs,
        content_size: content.length
      }

      const webhookResult = await notifyReportCompletion(
        jobId,
        reportId,
        reportType,
        content,
        'completed',
        researchMetadata
      )

      // If webhook failed, fall back to direct database update
      if (!webhookResult.success && !webhookResult.usedWebhook) {
        console.warn(`Webhook failed for job ${jobId}, using direct database fallback`)
        const fallbackResult = await directDatabaseUpdate(
          jobId,
          reportId,
          reportTable,
          content,
          'completed',
          researchMetadata
        )
        
        if (!fallbackResult.success) {
          console.error(`Both webhook and database fallback failed for job ${jobId}`)
        }
      }
    }
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err?.message || err)
    
    if (supabase) {
      await supabase
        .from('report_jobs')
        .update({
          status: 'failed',
          error: err?.message || 'Job failed',
          percent: 100,
          eta_seconds: 0,
          completed_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
    }

    // Reflect failure in the target report row via webhook or dynamic questionnaire fallback
    try {
      const { data: jobRow } = await supabase
        .from('report_jobs')
        .select('metadata')
        .eq('job_id', jobId)
        .single()
      const reportType = (jobRow as any)?.metadata?.report_type as string | undefined
      const reportId = (jobRow as any)?.metadata?.report_id as string | undefined
      const reportTable = getReportTableFromType(reportType)
      const summaryIdForDynamic = (jobRow as any)?.metadata?.summary_id || (jobRow as any)?.summary_id
      
      if (String(reportType).toLowerCase() === 'dynamic_questionnaire' && summaryIdForDynamic) {
        await notifyDynamicQuestionnaire(jobId, String(summaryIdForDynamic), {}, 'failed', err?.message || 'Job failed')
      } else if (reportTable && reportId && reportType) {
        const researchMetadata = {
          ...(jobRow as any)?.metadata,
          job_id: jobId,
          error: err?.message || 'Job failed',
          failed_at: new Date().toISOString(),
          provider: (process.env.VITE_LLM_PROVIDER as any)?.includes('openai') ? 'openai' : 'anthropic'
        }

        const webhookResult = await notifyReportCompletion(
          jobId,
          reportId,
          reportType,
          '',  // Empty content for failed jobs
          'failed',
          researchMetadata,
          err?.message || 'Job failed'
        )

        // If webhook failed, fall back to direct database update
        if (!webhookResult.success && !webhookResult.usedWebhook) {
          console.warn(`Failure webhook failed for job ${jobId}, using direct database fallback`)
          await directDatabaseUpdate(
            jobId,
            reportId,
            reportTable,
            '',
            'failed',
            researchMetadata,
            err?.message || 'Job failed'
          )
        }
      }
    } catch (updateErr) {
      console.error(`Failed to update report failure status for job ${jobId}:`, updateErr)
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Check if database is configured
  if (!supabase) {
    // Fallback to in-memory implementation if database not configured
    console.warn('Database not configured, falling back to in-memory storage')
    const inMemoryHandler = await import('./reportJobs')
    return inMemoryHandler.default(req, res)
  }

  if (req.method === 'POST') {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotency_key as string) || ''
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
      const prompt: string = body.prompt
      const model: string | undefined = body.model
      const temperature: number | undefined = body.temperature
      const max_tokens: number | undefined = body.max_tokens
      const summary_id: string | undefined = body.summary_id
      const user_id: string | undefined = body.user_id
      const metadataFromBody: any = body.metadata || {}
      const report_type: string | undefined = body.report_type || metadataFromBody.report_type
      const report_id: string | undefined = body.report_id || metadataFromBody.report_id

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'prompt is required' })
      }

      // Check for existing job with idempotency key
      if (idempotencyKey) {
        const { data: existing } = await supabase
          .from('report_jobs')
          .select('job_id')
          .eq('idempotency_key', idempotencyKey)
          .single()
        
        if (existing) {
          return res.status(202).json({ 
            job_id: existing.job_id, 
            status_url: `/api/reportJobsDb?job_id=${existing.job_id}` 
          })
        }
      }

      // Create new job
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      
      const { error: insertError } = await supabase
        .from('report_jobs')
        .insert({
          job_id: jobId,
          user_id: user_id || null,
          summary_id: summary_id || null,
          status: 'queued',
          model: model || 'sonar',
          prompt: prompt.substring(0, 10000), // Limit prompt size
          temperature: temperature || 0.2,
          max_tokens: max_tokens || 2600,
          percent: 0,
          eta_seconds: 90,
          idempotency_key: idempotencyKey || null,
          metadata: {
            source: 'api',
            timestamp: new Date().toISOString(),
            ...(metadataFromBody || {}),
            ...(report_type ? { report_type } : {}),
            ...(report_id ? { report_id } : {}),
          }
        })

      if (insertError) {
        console.error('Failed to create job:', insertError)
        return res.status(500).json({ error: 'Failed to create job' })
      }

      // Start job asynchronously
      setTimeout(() => {
        void runJob(jobId, prompt, model, temperature, max_tokens)
      }, 5)

      return res.status(202).json({ 
        job_id: jobId, 
        status_url: `/api/reportJobsDb?job_id=${jobId}` 
      })
    } catch (e: any) {
      console.error('Error in POST handler:', e)
      return res.status(500).json({ error: e?.message || 'Failed to create job' })
    }
  }

  if (req.method === 'GET') {
    const jobId = (req.query?.job_id as string) || ''
    if (!jobId) return res.status(400).json({ error: 'job_id is required' })
    
    try {
      const { data: job, error } = await supabase
        .from('report_jobs')
        .select('job_id, status, percent, eta_seconds, result, error')
        .eq('job_id', jobId)
        .single()
      
      if (error || !job) {
        return res.status(404).json({ error: 'Job not found' })
      }
      
      return res.status(200).json({
        job_id: job.job_id,
        status: job.status,
        percent: job.percent ?? 0,
        eta_seconds: job.eta_seconds ?? 0,
        result: job.result ?? null,
        error: job.error ?? null
      })
    } catch (e: any) {
      console.error('Error in GET handler:', e)
      return res.status(500).json({ error: 'Failed to get job status' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
