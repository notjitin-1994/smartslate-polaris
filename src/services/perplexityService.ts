import { BaseApiClient } from './api/baseClient'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

export type PerplexityMessage = {
  role: 'user' | 'assistant'  // Perplexity API only supports 'user' and 'assistant' roles
  content: string
}

export interface PerplexityConfig {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Service for making research calls to Perplexity AI
 */
class PerplexityService {
  private client: BaseApiClient
  
  constructor() {
    this.client = new BaseApiClient({
      baseUrl: '/api', // Always use API routes for consistent behavior
      timeout: 75000, // Optimized timeout for sonar-pro
      retries: 1,
      retryDelay: 800,
    })
  }
  
  /**
   * Call Perplexity for research
   */
  async research(
    prompt: string,
    config: PerplexityConfig = {}
  ): Promise<{ content: string; model?: string }> {
    const model = config.model || env.perplexityModel || 'sonar-pro'
    const temperature = config.temperature ?? 0.1
    const maxTokens = config.maxTokens || 800
    
    // Perplexity API doesn't support 'system' role, so we include context in the user message
    const contextualPrompt = `You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.

${prompt}`
    
    const messages: PerplexityMessage[] = [
      {
        role: 'user',
        content: contextualPrompt
      }
    ]
    
    try {
      const requestPayload = {
        model,
        temperature,
        messages,
        max_tokens: maxTokens,
      }
      
      if (env.isDev) {
        console.log('Perplexity request payload:', JSON.stringify(requestPayload, null, 2))
        console.log('Using model:', model)
      }
      
      const response = await this.client.post<any>('/perplexity', requestPayload, { timeout: 75000, retries: 1 })
      
      const content = response.data?.choices?.[0]?.message?.content
      
      if (!content) {
        throw new AppError('No response from Perplexity', 'PERPLEXITY_NO_RESPONSE')
      }
      
      return { content, model }
    } catch (error) {
      console.warn('Perplexity research error:', error)
      // Log more details about the error
      if (error instanceof Error && (error as any).details) {
        console.warn('Error details:', (error as any).details)
      }
      throw error
    }
  }
  
  /**
   * Research with greeting context (Stage 1)
   */
  async researchGreeting(data: {
    name: string
    role: string
    department: string
    email: string
    phone?: string
    timezone?: string
  }): Promise<string> {
    const prompt = `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.
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
    const result = await this.researchWithRetry(prompt, { model: (env as any).perplexityGreetingModel || 'sonar', maxTokens: 1200 })
    return result.content
  }
  
  /**
   * Research organization information (Stage 2)
   */
  async researchOrganization(data: {
    orgName: string
    industry: string
    size: string
    headquarters: string
    website?: string
    mission?: string
    constraints?: string[]
    stakeholders?: string[]
    requesterRole?: string
  }): Promise<string> {
    const prompt = `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.  
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
    const result = await this.researchWithRetry(prompt, { model: (env as any).perplexityOrgModel || 'sonar-pro', maxTokens: 1800 })
    return result.content
  }
  
  /**
   * Research project requirements (Stage 3)
   */
  async researchRequirements(data: {
    objectives: string
    constraints: string
    audience: string
    timeline: string
    budget: string
    hardware?: string[]
    software?: string[]
    experts?: string[]
    other?: string
  }): Promise<string> {
    const prompt = `You are Solara Polaris's L&D research agent and an expert Learning Experience Designer & Instructional Designer.  
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
    const result = await this.researchWithRetry(prompt, { model: (env as any).perplexityRequirementModel || 'sonar-reasoning', maxTokens: 2000 })
    return result.content
  }
  
  /**
   * Research with timeout and error handling
   */
  async researchWithRetry(
    prompt: string,
    config: PerplexityConfig = {},
    maxRetries: number = 2
  ): Promise<{ content: string; error?: string }> {
    let lastError: Error | null = null
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await this.research(prompt, config)
        return { content: result.content }
      } catch (error) {
        lastError = error as Error
        console.error(`Perplexity research attempt ${i + 1} failed:`, error)
        
        if (i < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
        }
      }
    }
    
    // Return a fallback response if all retries failed
    return {
      content: 'Research data temporarily unavailable. Please proceed with the information provided.',
      error: lastError?.message || 'Research service unavailable'
    }
  }
}

// Export singleton instance
export const perplexityService = new PerplexityService()

// Export convenience functions
export const researchGreeting = (data: Parameters<PerplexityService['researchGreeting']>[0]) => 
  perplexityService.researchGreeting(data)

export const researchOrganization = (data: Parameters<PerplexityService['researchOrganization']>[0]) => 
  perplexityService.researchOrganization(data)

export const researchRequirements = (data: Parameters<PerplexityService['researchRequirements']>[0]) => 
  perplexityService.researchRequirements(data)
