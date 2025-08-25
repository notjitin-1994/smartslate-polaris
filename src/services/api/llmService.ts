import { BaseApiClient } from './baseClient'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMConfig {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Unified LLM service that supports multiple providers
 */
class LLMService {
  private openaiClient: BaseApiClient
  private anthropicClient: BaseApiClient
  
  constructor() {
    // Initialize API clients for different providers
    this.openaiClient = new BaseApiClient({
      baseUrl: '/api',
      timeout: 60000, // 60 seconds for LLM calls
      retries: 2,
    })
    
    this.anthropicClient = new BaseApiClient({
      baseUrl: '/api',
      timeout: 60000,
      retries: 2,
    })
  }
  
  /**
   * Call LLM with automatic provider selection
   */
  async callLLM(
    messages: ChatMessage[],
    config: LLMConfig = {}
  ): Promise<{ content: string; model?: string }> {
    const provider = env.llmProvider || 'openai'
    
    try {
      if (provider === 'anthropic') {
        return await this.callAnthropic(messages, config)
      }
      
      return await this.callOpenAI(messages, config)
    } catch (error) {
      console.error(`LLM call failed with provider ${provider}:`, error)
      
      // Optionally fallback to another provider
      if (provider === 'anthropic' && env.openaiApiKey) {
        console.log('Falling back to OpenAI...')
        return await this.callOpenAI(messages, config)
      }
      
      throw error
    }
  }
  
  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    messages: ChatMessage[],
    config: LLMConfig = {}
  ): Promise<{ content: string; model?: string }> {
    const model = config.model || env.openaiModel || 'gpt-4-turbo-preview'
    const temperature = config.temperature ?? 0.2
    const maxTokens = config.maxTokens || 4096
    
    const response = await this.openaiClient.post<any>('/openai', {
      model,
      temperature,
      messages,
      max_tokens: maxTokens,
    })
    
    const content = response.data?.choices?.[0]?.message?.content
    
    if (!content) {
      throw new AppError('No response from OpenAI', 'LLM_NO_RESPONSE')
    }
    
    return { content, model }
  }
  
  /**
   * Call Anthropic API
   */
  private async callAnthropic(
    messages: ChatMessage[],
    config: LLMConfig = {}
  ): Promise<{ content: string; model?: string }> {
    const model = config.model || env.anthropicModel || 'claude-3-5-sonnet-latest'
    const temperature = config.temperature ?? 0.2
    // Determine requested max, then clamp to model's allowed output tokens
    const requestedMax = typeof config.maxTokens === 'number'
      ? config.maxTokens
      : (env.anthropicMaxTokens ? Number(env.anthropicMaxTokens) : 4096)
    const modelMax = getAnthropicModelOutputLimit(model)
    const maxTokens = Math.min(Number.isFinite(requestedMax) ? requestedMax : 4096, modelMax)
    
    // Convert OpenAI-style messages to Anthropic format
    const systemParts = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
    const system = systemParts.length ? systemParts.join('\n\n') : undefined
    
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    
    const response = await this.anthropicClient.post<any>('/anthropic', {
      model,
      temperature,
      system,
      messages: nonSystemMessages,
      max_tokens: maxTokens,
    })
    
    const content = Array.isArray(response.data?.content)
      ? response.data.content.find((c: any) => c.type === 'text')?.text
      : response.data?.content
    
    if (!content) {
      throw new AppError('No response from Anthropic', 'LLM_NO_RESPONSE')
    }
    
    return { content, model }
  }
  
  /**
   * Stream LLM response (for future implementation)
   */
  async *streamLLM(
    messages: ChatMessage[],
    config: LLMConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    // This would implement streaming responses
    // For now, just return the full response
    const response = await this.callLLM(messages, config)
    yield response.content
  }
  
  /**
   * Call LLM with automatic retry and fallback
   */
  async callLLMWithFallback(
    messages: ChatMessage[],
    config: LLMConfig = {},
    options: {
      primaryProvider?: 'openai' | 'anthropic'
      fallbackProvider?: 'openai' | 'anthropic'
    } = {}
  ): Promise<{ content: string; model?: string; provider: string }> {
    const primary = options.primaryProvider || env.llmProvider || 'openai'
    const fallback = options.fallbackProvider || (primary === 'openai' ? 'anthropic' : 'openai')
    
    try {
      const result = primary === 'anthropic'
        ? await this.callAnthropic(messages, config)
        : await this.callOpenAI(messages, config)
      
      return { ...result, provider: primary }
    } catch (primaryError) {
      console.error(`Primary LLM provider (${primary}) failed:`, primaryError)
      
      // Try fallback provider
      try {
        const result = fallback === 'anthropic'
          ? await this.callAnthropic(messages, config)
          : await this.callOpenAI(messages, config)
        
        console.log(`Successfully used fallback provider (${fallback})`)
        return { ...result, provider: fallback }
      } catch (fallbackError) {
        console.error(`Fallback LLM provider (${fallback}) also failed:`, fallbackError)
        
        // Throw the original error as it's more relevant
        throw primaryError
      }
    }
  }

  /**
   * Utility: Max output tokens per Anthropic model (conservative defaults)
   */
}

function getAnthropicModelOutputLimit(model: string): number {
  const m = (model || '').toLowerCase()
  // Claude Sonnet 3.5 current output cap ~8192
  if (m.includes('sonnet')) return 8192
  // Haiku is typically lower; set to 4096 conservatively
  if (m.includes('haiku')) return 4096
  // Opus can be similar to Sonnet for output; keep 8192 conservative
  if (m.includes('opus')) return 8192
  // Default conservative cap
  return 8192
}

// Export singleton instance
export const llmService = new LLMService()

// Export convenience function for backward compatibility
export async function callLLM(
  messages: ChatMessage[],
  config: LLMConfig = {}
): Promise<{ content: string }> {
  return llmService.callLLM(messages, config)
}
