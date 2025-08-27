import { BaseApiClient } from './baseClient'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'
import { budgetOutputTokens, assertSufficientBudget } from '@/services/ai/budget'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMConfig {
  temperature?: number
  maxTokens?: number
  model?: string
  provider?: 'openai' | 'anthropic'
  // When expecting JSON, enable provider-native JSON modes where available
  responseFormat?: 'json_object' | { type: 'json_schema'; json_schema: any }
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
      timeout: 240000,
      retries: 2,
    })
    
    this.anthropicClient = new BaseApiClient({
      baseUrl: '/api',
      timeout: 240000,
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
    const provider = config.provider || env.llmProvider || 'openai'
    if (provider === 'anthropic') {
      return await this.callAnthropic(messages, config)
    }
    return await this.callOpenAI(messages, config)
  }
  
  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    messages: ChatMessage[],
    config: LLMConfig = {}
  ): Promise<{ content: string; model?: string }> {
    const model = config.model || env.openaiModel || 'gpt-4o-mini'
    const temperature = config.temperature ?? 0.2
    const inputStrings: string[] = messages.map(m => m.content)
    const computedMax = budgetOutputTokens({
      modelContextLimit: env.modelContextLimits.openai,
      inputStrings,
      desiredMax: typeof config.maxTokens === 'number' ? config.maxTokens : env.maxOutputTokens,
    })
    assertSufficientBudget(computedMax)

    const payload: any = {
      model,
      temperature,
      messages,
      max_tokens: computedMax,
      stream: false,
    }
    // For OpenAI: response_format must be used with Responses API; handled by server proxy

    const response = await this.openaiClient.post<any>('/openai', payload)

    const choice = response.data?.choices?.[0]
    const content = choice?.message?.content || ''
    const finishReason: string | undefined = choice?.finish_reason

    if (!content) {
      throw new AppError('Empty content from OpenAI', 'LLM_NO_RESPONSE')
    }
    if (finishReason && (finishReason === 'length' || finishReason === 'max_tokens')) {
      const err = new AppError('Model output truncated; reduce inputs and try again', 'LLM_TRUNCATED')
      ;(err as any).statusCode = 507
      throw err
    }
    if (finishReason && finishReason !== 'stop') {
      const err = new AppError(`Unexpected finish reason: ${finishReason}`, 'LLM_UNEXPECTED_FINISH')
      throw err
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
    const inputStrings: string[] = messages.map(m => m.content)
    const computedMax = budgetOutputTokens({
      modelContextLimit: env.modelContextLimits.anthropic,
      inputStrings,
      desiredMax: typeof config.maxTokens === 'number' ? config.maxTokens : env.maxOutputTokens,
    })
    assertSufficientBudget(computedMax)
    
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
    
    const payload: any = {
      model,
      temperature,
      system,
      messages: nonSystemMessages,
      max_tokens: computedMax,
    }
    if (config.responseFormat) {
      ;(payload as any).response_format = config.responseFormat
    }

    const response = await this.anthropicClient.post<any>('/anthropic', payload)

    const stopReason: string | undefined = response.data?.stop_reason
    const content = Array.isArray(response.data?.content)
      ? response.data.content.find((c: any) => c.type === 'text')?.text
      : response.data?.content

    if (!content) {
      throw new AppError('Empty content from Anthropic', 'LLM_NO_RESPONSE')
    }
    if (stopReason && stopReason === 'max_tokens') {
      const err = new AppError('Model output truncated; reduce inputs and try again', 'LLM_TRUNCATED')
      ;(err as any).statusCode = 507
      throw err
    }
    if (stopReason && stopReason !== 'end_turn' && stopReason !== 'stop_sequence' && stopReason !== 'unknown') {
      const err = new AppError(`Unexpected stop reason: ${stopReason}`, 'LLM_UNEXPECTED_FINISH')
      throw err
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
  
  // Intentionally no cross-provider fallback to honor single-call policy

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
