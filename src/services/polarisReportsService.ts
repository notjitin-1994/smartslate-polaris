import { getSupabase } from '@/lib/supabaseClient'
import { BaseApiClient } from '@/services/api/baseClient'
import { env } from '@/config/env'
import { unifiedAIService } from '@/services/unifiedAIService'

export type ReportType = 'greeting' | 'org' | 'requirement'
export type ResearchStatus = 'pending' | 'running' | 'completed' | 'failed'

type Json = Record<string, any>

type CreateReportOptions = {
  summaryId?: string
  status?: ResearchStatus
  metadata?: Record<string, any>
}

const supabase = getSupabase()
const apiClient = new BaseApiClient({ baseUrl: '/api', timeout: 80000, retries: 1 })

function getTableName(type: ReportType): 'greeting_reports' | 'org_reports' | 'requirement_reports' {
  if (type === 'greeting') return 'greeting_reports'
  if (type === 'org') return 'org_reports'
  return 'requirement_reports'
}

function nowIso(): string {
  return new Date().toISOString()
}

function defaultMetadata(extra?: Record<string, any>) {
  return {
    source: 'app',
    provider: 'perplexity',
    timestamp: nowIso(),
    ...extra,
  }
}

export async function createGreetingReport(
  userData: Json,
  researchReport?: string | null,
  options: CreateReportOptions = {}
) {
  return createReport('greeting', userData, researchReport, options)
}

export async function createOrgReport(
  userData: Json,
  researchReport?: string | null,
  options: CreateReportOptions = {}
) {
  return createReport('org', userData, researchReport, options)
}

export async function createRequirementReport(
  userData: Json,
  researchReport?: string | null,
  options: CreateReportOptions = {}
) {
  return createReport('requirement', userData, researchReport, options)
}

async function createReport(
  type: ReportType,
  userData: Json,
  researchReport?: string | null,
  options: CreateReportOptions = {}
): Promise<{ data: any | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const table = getTableName(type)
    const status: ResearchStatus = options.status || (researchReport ? 'completed' : 'pending')
    const metadata = options.metadata || (researchReport ? defaultMetadata({ mode: 'sync' }) : defaultMetadata({ mode: 'pending' }))

    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: user.id,
        summary_id: options.summaryId || null,
        user_data: userData || {},
        research_report: researchReport || null,
        research_status: status,
        research_metadata: metadata,
      })
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function updateResearchReport(
  reportId: string,
  newResearch: string,
  reportType?: ReportType,
  extraMetadata?: Record<string, any>
): Promise<{ data: any | null; error: any }> {
  try {
    const tableCandidates: Array<'greeting_reports' | 'org_reports' | 'requirement_reports'> = reportType
      ? [getTableName(reportType)]
      : ['greeting_reports', 'org_reports', 'requirement_reports']

    for (const table of tableCandidates) {
      const { data, error } = await supabase
        .from(table)
        .update({
          research_report: newResearch,
          research_status: 'completed' as ResearchStatus,
          research_metadata: defaultMetadata({ mode: 'sync-update', ...extraMetadata }),
        })
        .eq('id', reportId)
        .select()
        .maybeSingle()

      if (error) return { data: null, error }
      if (data) return { data, error: null }
    }
    return { data: null, error: new Error('Report not found in any report table') }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getCompleteReport(
  reportType: ReportType,
  summaryId: string
): Promise<{ data: any | null; error: any }> {
  try {
    const table = getTableName(reportType)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('summary_id', summaryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data: data || null, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ---------- Research integration ----------

export async function runGreetingResearchSync(reportId: string, data: {
  name: string
  role: string
  department: string
  email: string
  phone?: string
  timezone?: string
}) {
  const prompt = (function () {
    return `You are Solara Polaris's L&D research agent. Generate the greeting intake brief using this JSON:\n${JSON.stringify(data)}\n\nFollow the standard sections and rules. Return only Markdown.`
  })()
  const r = await unifiedAIService.research(prompt, { maxTokens: 1200, temperature: 0.3 })
  return updateResearchReport(reportId, r.content, 'greeting', { provider: r.provider, model: r.model })
}

export async function runOrgResearchSync(reportId: string, data: {
  orgName: string
  industry: string
  size: string
  headquarters: string
  website?: string
  mission?: string
  constraints?: string[]
  stakeholders?: string[]
  requesterRole?: string
}) {
  const prompt = (function () {
    return `You are Solara Polaris's L&D research agent. Generate the organization intake brief using this JSON:\n${JSON.stringify(data)}\n\nFollow the standard sections and rules. Return only Markdown.`
  })()
  const r = await unifiedAIService.research(prompt, { maxTokens: 1800, temperature: 0.3 })
  return updateResearchReport(reportId, r.content, 'org', { provider: r.provider, model: r.model })
}

export async function runRequirementResearchSync(reportId: string, data: {
  objectives: string
  constraints: string
  audience: string
  timeline: string
  budget: string
  hardware?: string[]
  software?: string[]
  experts?: string[]
  other?: string
}) {
  const prompt = (function () {
    return `You are Solara Polaris's L&D research agent. Generate the requirements brief using this JSON:\n${JSON.stringify(data)}\n\nFollow the standard sections and rules. Return only Markdown.`
  })()
  const r = await unifiedAIService.research(prompt, { maxTokens: 2000, temperature: 0.3 })
  return updateResearchReport(reportId, r.content, 'requirement', { provider: r.provider, model: r.model })
}

// Build prompts for async job path (mirrors perplexityService prompts)
function buildGreetingPrompt(data: {
  name: string
  role: string
  department: string
  email: string
  phone?: string
  timezone?: string
}) {
  return `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.
Adopt a concise, thoughtful, structured, collaborative tone with short paragraphs, clear lists, and concrete next steps.

GOAL
Produce a decision-ready "Needs Analysis Intake Brief — Individual" focused ONLY on insights that help scope L&D for THIS specific person and their context. Exclude broad industry overviews unless they directly impact this role/department.

INPUT (verbatim; do not normalize or guess):
- Name: ${data.name}
- Role: ${data.role}
- Department: ${data.department}
- Email: ${data.email}
${data.phone ? `- Phone: ${data.phone}` : ''}
${data.timezone ? `- Timezone: ${data.timezone}` : ''}

RESEARCH RULES (STRICT)
- Use current web sources; prefer items from the last 18 months. If older, explain why still relevant.
- Cite every non-obvious claim and all public-profile findings with source name + domain + date.
- Do NOT fabricate. If you're unsure, say "uncertain" and state what would verify it.
- For public-profile matching: search by full name + role + department + email domain/company; cross-check multiple signals (role/title history, org, region/timezone clues, headshot). If ambiguity remains, report "no reliable match".
- Privacy: summarize only public, professional information; skip personal data.

OUTPUT — Markdown, using these exact sections and priorities:

## Role Snapshot (30–60 words)
Why this role matters in L&D terms for their department; 1–2 likely business outcomes they influence.

## Likely L&D Challenges (ranked)
- [Challenge] — why it likely applies here (1–2 lines) [source if external]
- …

## Department-Relevant Best Practices (actionable)
- [Practice → impact on KPIs/operations] (1–2 lines) [source]
- …

## Current Training Trends to Watch (last 18 months; filter for this role/department)
- [Trend → why it matters here; implementation implication] [source]
- …

## Stakeholder Discovery Questions (map to needs-analysis inputs)
Ask only what will unblock scoping. Group under:
- Learners (audience, motivation, accessibility, language/cultural factors, time availability, device/work environment)
- Technology & Data (available platforms, constraints, integration, analytics readiness)
- Talent & Capacity (internal roles, gaps, external help)
- Delivery & Change (risk tolerance, change readiness, timelines, budget bands)
- Measurement (success metrics linked to business outcomes; data sources)

## Public Profile Matches (if any; otherwise say "No reliable matches")
- [Confidence: High/Med/Low] Name — Role, Org (key verified facts)
  Source: [link], [date]
- …

## Gaps, Assumptions & Next Steps
- [Known gap or ambiguity] → [proposed verification step]
- [Immediate, low-effort next step for intake]

FORMATTING
- Keep bullets tight; avoid tables unless they add clarity.
- Always include sources inline at the end of bullets where relevant.
- If nothing material is found for a section, write: "None found / needs stakeholder input".

DELIVERABLE
Return ONLY the Markdown brief as specified above—no preamble or closing remarks.`
}

function buildOrgPrompt(data: {
  orgName: string
  industry: string
  size: string
  headquarters: string
  website?: string
  mission?: string
  constraints?: string[]
  stakeholders?: string[]
  requesterRole?: string
}) {
  return `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.  
Adopt a concise, structured, decision-support tone with short paragraphs, clear lists, and concrete next steps.

GOAL
Produce a decision-ready "Needs Analysis Intake Brief — Organization" that surfaces:
- The organization's **goals, plans, and current strategic focus** (public and verifiable).
- **Legal and internal compliance requirements** that could affect L&D initiatives.
- Any other **relevant organizational, industry, or regulatory factors** that might shape discovery, scoping, or analysis of the learning requirement.
- Practical, role-appropriate **questions the requester can ask stakeholders**, framed around compliance, goals, and organizational readiness.

INPUT (verbatim; do not normalize or guess):
- Organization: ${data.orgName}
- Industry: ${data.industry}
- Size: ${data.size}
- Headquarters: ${data.headquarters}
${data.website ? `- Website: ${data.website}` : ''}
${data.mission ? `- Mission: ${data.mission}` : ''}
${data.constraints?.length ? `- Legal/Compliance Constraints: ${data.constraints.join(', ')}` : ''}
${data.stakeholders?.length ? `- Key Stakeholders: ${data.stakeholders.join(', ')}` : ''}
${data.requesterRole ? `- Requester Role: ${data.requesterRole}` : ''}

RESEARCH RULES (STRICT)
- Use current web sources; prioritize last 18 months for strategy, compliance, industry trends. If older, justify relevance.
- Cite every non-obvious claim with source name + domain + date.
- Do NOT fabricate. If you are unsure, state "uncertain" and what would confirm it.
- For organizational info: confirm using multiple signals (website, press releases, filings, news, analyst reports).
- For compliance: surface BOTH external legal/regulatory obligations AND any known internal governance/compliance practices.
- Privacy: only include public, professional information.

OUTPUT — Markdown, using these exact sections:

## Organization Snapshot (≤80 words)
Who they are, scale, where they operate, and declared mission/values. Call out unique differentiators that shape L&D.

## Current Goals, Plans & Focus Areas
Summarize what the org is currently prioritizing (growth, transformation, cost optimization, innovation, ESG/DEI, etc).  
- [Goal/Plan] — context and potential L&D implications [source]

## Industry L&D & Compliance Context
- [Requirement or standard] — why it matters here [source]
- [Constraint] — compliance/legal/internal governance implication [source]

## Training Challenges for This Org Type/Size
Ranked by likelihood and impact. Each with 1–2 lines explanation.

## Regulatory & Internal Compliance Requirements
Summarize external **laws/regs** and internal **policies/standards** shaping training, certification, or reporting. Include citations.

## Best Practices (peer organizations)
- [Practice → impact on compliance alignment, workforce effectiveness, or risk mitigation] [source]

## Technology Adoption in Sector
- [Pattern → implication for L&D delivery/analytics] [source]

## Workforce Development Trends
- [Trend → why it matters for this org's sector/size/focus] [source]

## Stakeholder Discovery Questions (tailored to requester role)
Frame around compliance and organizational readiness. Group under:
- **Strategy & Goals** (e.g., "How does L&D link to our current transformation/expansion focus?")
- **Compliance & Legal** (e.g., "Which laws, standards, or audits dictate mandatory training?")
- **Internal Governance** (e.g., "What internal codes or policies require documented learning?")
- **Technology & Data** (e.g., "How do compliance tools integrate with LMS/HR systems?")
- **Budget & Change** (e.g., "What level of investment is approved for compliance-driven L&D?")

## Public Profile Matches (organization only)
- [Confidence: High/Med/Low] Org — verified info (HQ, exec names, filings, public reports)  
  Source: [link], [date]  
If none: "No reliable public profiles or matches."

## Gaps, Assumptions & Next Steps
- [Gap/uncertainty] → [proposed verification step]  
- [Immediate step for stakeholder intake]

FORMATTING
- Keep bullets tight; avoid long prose.
- Always cite sources inline at end of bullets.
- If no material found for a section, write: "None found / needs stakeholder input".

DELIVERABLE
Return ONLY the Markdown brief in the format above — no preamble or closing remarks.`
}

function buildRequirementPrompt(data: {
  objectives: string
  constraints: string
  audience: string
  timeline: string
  budget: string
  hardware?: string[]
  software?: string[]
  experts?: string[]
  other?: string
}) {
  return `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.  
Adopt a structured, practical, solution-oriented tone with clear recommendations.

GOAL  
Produce a decision-ready **"Requirements Brief — L&D Project"** that:  
- Connects objectives, constraints, audience, budget, and timeline into a **scoped design response**.  
- Recommends delivery, technology, measurement, and risk mitigation aligned to the inputs.  
- Surfaces innovation and optimization opportunities while respecting constraints.  
- Anchors every recommendation in **examples, best practices, or similar successful initiatives** (cited).  

INPUT (verbatim; do not normalize or guess):  
- Objectives: ${data.objectives}  
- Constraints: ${data.constraints}  
- Target Audience: ${data.audience}  
- Timeline: ${data.timeline}  
- Budget Range: ${data.budget}  
${data.hardware?.length ? `- Available Hardware: ${data.hardware.join(', ')}` : ''}  
${data.software?.length ? `- Available Software: ${data.software.join(', ')}` : ''}  
${data.experts?.length ? `- Subject Matter Experts: ${data.experts.join(', ')}` : ''}  
${data.other ? `- Additional Context: ${data.other}` : ''}  

RESEARCH RULES (STRICT)  
- Use current sources; prioritize examples from the past 3 years.  
- Cite non-obvious claims and all external examples with source + date.  
- Do not fabricate; if unclear, say "uncertain" and propose what to validate with stakeholders.  
- Keep privacy: no personal or speculative data.  

OUTPUT — Markdown, using these exact sections:

## Project Snapshot (≤50 words)
Restate objectives, constraints, and context succinctly.

## Reference Initiatives (comparables)
Examples of similar successful L&D initiatives, outcomes, and lessons learned.  
- [Initiative] — outcome (source)

## Recommended Delivery Modalities
- [Modality] → why suited to objectives, audience, and constraints.

## Technology Fit
Map available hardware/software and budget to recommended solutions.  
- [Tech/tool] — fit (source if available)

## Content Development Best Practices
Target audience–specific guidelines (tone, cultural, accessibility, interactivity).  
- [Practice] → impact

## Measurement & Assessment
KPIs, assessment methods, and feedback loops aligned to objectives.  
- [Method] → what it measures and how it links to business outcomes.

## Risk Factors & Mitigation
List probable risks (budget, adoption, SME bandwidth, compliance) and practical mitigation strategies.  
- [Risk] → [Mitigation]

## Resource Optimization
Ways to stretch budget, timeline, and SMEs.  
- [Optimization strategy] → [Impact]

## Innovation Opportunities
New methods, tools, or approaches possible within constraints.  
- [Innovation] → [Benefit]

## Stakeholder Discovery Questions
Tailored to scope refinement, grouped by:  
- Objectives & Impact (e.g., "Which objectives are non-negotiable vs flexible?")  
- Audience (e.g., "What accessibility/accommodation requirements exist?")  
- Tech & Data (e.g., "Do current systems track compliance or performance?")  
- Budget & Timeline (e.g., "What trade-offs are acceptable if timeline slips?")  

## Gaps, Assumptions & Next Steps
- [Gap/uncertainty] → [proposed verification step]  
- [Immediate step for stakeholder intake]

FORMATTING  
- Use short paragraphs and bulleted recommendations.  
- Cite examples inline.  
- If nothing found for a section: write "None found / needs stakeholder input".

DELIVERABLE  
Return ONLY the Markdown brief in the format above — no preamble or closing remarks.`
}

export async function startResearchJobForReport(args: {
  reportType: ReportType
  reportId: string
  summaryId?: string
  model?: string
  temperature?: number
  maxTokens?: number
  prompt: string
  idempotencyKey?: string
}): Promise<{ data: { job_id: string; status_url: string } | null; error: any }> {
  try {
    const payload = {
      prompt: args.prompt,
      model: args.model || env.perplexityModel || 'sonar-pro',
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 1800,
      summary_id: args.summaryId || null,
    }
    const headers: Record<string, string> = {}
    const idem = args.idempotencyKey || `${args.reportType}:${args.reportId}`
    headers['Idempotency-Key'] = idem

    const response = await apiClient.post<{ job_id: string; status_url: string }>('/reportJobsDb', payload, { headers })
    return { data: response.data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function startGreetingResearchAsync(reportId: string, data: Parameters<typeof buildGreetingPrompt>[0], summaryId?: string) {
  const prompt = buildGreetingPrompt(data)
  return startResearchJobForReport({ reportType: 'greeting', reportId, summaryId, prompt, model: env.perplexityGreetingModel || 'sonar', maxTokens: 1200 })
}

export async function startOrgResearchAsync(reportId: string, data: Parameters<typeof buildOrgPrompt>[0], summaryId?: string) {
  const prompt = buildOrgPrompt(data)
  return startResearchJobForReport({ reportType: 'org', reportId, summaryId, prompt, model: env.perplexityOrgModel || 'sonar-pro', maxTokens: 1800 })
}

export async function startRequirementResearchAsync(reportId: string, data: Parameters<typeof buildRequirementPrompt>[0], summaryId?: string) {
  const prompt = buildRequirementPrompt(data)
  return startResearchJobForReport({ reportType: 'requirement', reportId, summaryId, prompt, model: env.perplexityRequirementModel || 'sonar-reasoning', maxTokens: 2000 })
}

export async function applyJobResultToReport(jobId: string): Promise<{ data: any | null; error: any }> {
  try {
    const statusUrl = `/reportJobsDb?job_id=${encodeURIComponent(jobId)}`
    const response = await apiClient.get<{ job_id: string; status: string; result?: string | null; error?: string | null }>(statusUrl)
    const job = response.data

    if (!job || (job.status !== 'succeeded' && job.status !== 'failed')) {
      return { data: null, error: new Error('Job not complete yet') }
    }

    if (job.status === 'failed') {
      // Nothing to update, but report failure state could be set if desired
      return { data: null, error: new Error(job.error || 'Job failed') }
    }

    const content = (job.result || '').trim()
    if (!content) return { data: null, error: new Error('Empty job result') }

    // We can't know reportId from the job alone unless the caller tracks it.
    // Caller should update by reportId directly; here we only return content.
    return { data: { content }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ---------- Webhook-related functions ----------

export async function getReportWebhookStatus(
  reportType: ReportType,
  reportId: string
): Promise<{ data: any | null; error: any }> {
  try {
    const table = getTableName(reportType)
    const { data, error } = await supabase
      .from(table)
      .select('webhook_status, webhook_attempts, webhook_last_attempt, webhook_response')
      .eq('id', reportId)
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getReportsWithFailedWebhooks(): Promise<{ data: any[] | null; error: any }> {
  try {
    const tables = ['greeting_reports', 'org_reports', 'requirement_reports'] as const
    const allFailedReports = []

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id, webhook_status, webhook_attempts, webhook_last_attempt, research_status, created_at')
        .in('webhook_status', ['failed', 'retrying'])
        .lt('webhook_attempts', 3) // Only get reports with retry attempts remaining

      if (error) {
        console.warn(`Failed to query ${table} for failed webhooks:`, error)
        continue
      }

      if (data && data.length > 0) {
        allFailedReports.push(
          ...data.map(report => ({
            ...report,
            report_type: table.replace('_reports', ''),
            table_name: table
          }))
        )
      }
    }

    return { data: allFailedReports, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function retryFailedWebhook(
  reportType: ReportType,
  reportId: string
): Promise<{ data: any | null; error: any }> {
  try {
    const table = getTableName(reportType)
    
    // Get the report data to retry
    const { data: report, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !report) {
      return { data: null, error: fetchError || new Error('Report not found') }
    }

    // Update status to retrying
    const { error: updateError } = await supabase
      .from(table)
      .update({
        webhook_status: 'retrying',
        webhook_last_attempt: new Date().toISOString()
      })
      .eq('id', reportId)

    if (updateError) {
      return { data: null, error: updateError }
    }

    // Here we could trigger a webhook retry by calling an internal API endpoint
    // For now, we'll just mark it as retrying and let the system handle it
    
    return { data: { success: true, status: 'retrying' }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getWebhookAuditLog(
  jobId?: string,
  reportId?: string,
  limit: number = 50
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('webhook_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    if (reportId) {
      query = query.eq('report_id', reportId)
    }

    const { data, error } = await query

    if (error) return { data: null, error }
    return { data: data || [], error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function getWebhookStatistics(): Promise<{ data: any | null; error: any }> {
  try {
    const tables = ['greeting_reports', 'org_reports', 'requirement_reports'] as const
    const stats = {
      total_reports: 0,
      webhook_success: 0,
      webhook_failed: 0,
      webhook_pending: 0,
      webhook_retrying: 0,
      by_type: {} as Record<string, any>
    }

    for (const table of tables) {
      const reportType = table.replace('_reports', '')
      
      const { data, error } = await supabase
        .from(table)
        .select('webhook_status')

      if (error) {
        console.warn(`Failed to get stats from ${table}:`, error)
        continue
      }

      if (data) {
        const typeStats = {
          total: data.length,
          success: 0,
          failed: 0,
          pending: 0,
          retrying: 0
        }

        data.forEach(report => {
          const status = report.webhook_status || 'pending'
          if (status === 'success') typeStats.success++
          else if (status === 'failed') typeStats.failed++
          else if (status === 'retrying') typeStats.retrying++
          else typeStats.pending++
        })

        stats.by_type[reportType] = typeStats
        stats.total_reports += typeStats.total
        stats.webhook_success += typeStats.success
        stats.webhook_failed += typeStats.failed
        stats.webhook_pending += typeStats.pending
        stats.webhook_retrying += typeStats.retrying
      }
    }

    return { data: stats, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function createReportWithWebhookTracking(
  type: ReportType,
  userData: Json,
  researchReport?: string | null,
  options: CreateReportOptions = {}
): Promise<{ data: any | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const table = getTableName(type)
    const status: ResearchStatus = options.status || (researchReport ? 'completed' : 'pending')
    const metadata = options.metadata || (researchReport ? defaultMetadata({ mode: 'sync' }) : defaultMetadata({ mode: 'pending' }))

    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: user.id,
        summary_id: options.summaryId || null,
        user_data: userData || {},
        research_report: researchReport || null,
        research_status: status,
        research_metadata: metadata,
        webhook_status: researchReport ? 'success' : 'pending', // If we have content, no webhook needed
        webhook_attempts: 0
      })
      .select()
      .single()

    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}


