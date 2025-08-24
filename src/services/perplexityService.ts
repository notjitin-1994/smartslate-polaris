import { BaseApiClient } from './api/baseClient'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

export type PerplexityMessage = {
  role: 'system' | 'user' | 'assistant'
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
      baseUrl: '/api',
      timeout: 50000, // keep below Vercel 60s limit
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
    const model = config.model || env.perplexityModel || 'llama-3.1-sonar-small-128k-online'
    const temperature = config.temperature ?? 0.1
    const maxTokens = config.maxTokens || 800
    
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful research assistant. Provide comprehensive, accurate information based on current web sources. Focus on facts and cite sources when possible.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
    
    try {
      const response = await this.client.post<any>('/perplexity', {
        model,
        temperature,
        messages,
        max_tokens: maxTokens,
      }, { timeout: env.isDev ? 75000 : 50000, retries: 1 })
      
      const content = response.data?.choices?.[0]?.message?.content
      
      if (!content) {
        throw new AppError('No response from Perplexity', 'PERPLEXITY_NO_RESPONSE')
      }
      
      return { content, model }
    } catch (error) {
      console.warn('Perplexity research error:', error)
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
    const prompt = `Research best practices and current trends in Learning & Development for someone with the following profile:
    
    Name: ${data.name}
    Role: ${data.role}
    Department: ${data.department}
    Email: ${data.email}
    ${data.phone ? `Phone: ${data.phone}` : ''}
    ${data.timezone ? `Timezone: ${data.timezone}` : ''}
    
    Provide insights on:
    1. Common L&D challenges for someone in this role
    2. Industry best practices relevant to their department
    3. Current trends in corporate training that might interest them
    4. Key questions they should be thinking about for their L&D initiatives
    
    Keep the response professional but personalized.`
    
    const result = await this.researchWithRetry(prompt)
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
  }): Promise<string> {
    const prompt = `Research comprehensive information about the following organization and its L&D implications:
    
    Organization: ${data.orgName}
    Industry: ${data.industry}
    Size: ${data.size}
    Headquarters: ${data.headquarters}
    ${data.website ? `Website: ${data.website}` : ''}
    ${data.mission ? `Mission: ${data.mission}` : ''}
    ${data.constraints?.length ? `Legal/Compliance Constraints: ${data.constraints.join(', ')}` : ''}
    ${data.stakeholders?.length ? `Key Stakeholders: ${data.stakeholders.join(', ')}` : ''}
    
    Research and provide:
    1. Public information about the organization (if available)
    2. Industry-specific L&D requirements and compliance needs
    3. Common training challenges for organizations of this size and type
    4. Regulatory requirements relevant to their industry
    5. Best practices for L&D in similar organizations
    6. Technology adoption patterns in their industry
    7. Workforce development trends in their sector
    
    Focus on actionable insights for L&D planning.`
    
    const result = await this.researchWithRetry(prompt)
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
    const prompt = `Research best practices and recommendations for an L&D project with the following requirements:
    
    Objectives: ${data.objectives}
    Constraints: ${data.constraints}
    Target Audience: ${data.audience}
    Timeline: ${data.timeline}
    Budget Range: ${data.budget}
    ${data.hardware?.length ? `Available Hardware: ${data.hardware.join(', ')}` : ''}
    ${data.software?.length ? `Available Software: ${data.software.join(', ')}` : ''}
    ${data.experts?.length ? `Subject Matter Experts: ${data.experts.join(', ')}` : ''}
    ${data.other ? `Additional Context: ${data.other}` : ''}
    
    Research and provide:
    1. Similar successful L&D initiatives and their outcomes
    2. Recommended delivery modalities for these objectives
    3. Technology solutions that fit the budget and constraints
    4. Content development best practices for the target audience
    5. Measurement and assessment strategies
    6. Risk factors and mitigation strategies
    7. Resource optimization approaches
    8. Innovation opportunities within the constraints
    
    Provide specific, actionable recommendations.`
    
    const result = await this.researchWithRetry(prompt)
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
