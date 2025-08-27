import { BaseApiClient } from './api/baseClient'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'
import { perplexityService } from './perplexityService'
import { llmService } from './api/llmService'
import type { ChatMessage } from './api/llmService'

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'perplexity'
export type AICapability = 'text' | 'vision' | 'audio' | 'video' | 'realtime' | 'research' | 'reasoning' | 'documents'

interface ProviderConfig {
  provider: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  capabilities: AICapability[]
  costPerToken?: number
  latency?: 'low' | 'medium' | 'high'
  contextWindow?: number
}

interface AIRequest {
  prompt: string
  inputType?: 'text' | 'image' | 'audio' | 'video' | 'document'
  capabilities?: AICapability[]
  preferredProvider?: AIProvider
  maxLatency?: 'low' | 'medium' | 'high'
  contextSize?: number
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  messages?: Array<{ role: string; content: string }>
}

interface AIResponse {
  content: string
  provider: AIProvider
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  metadata?: Record<string, any>
}

// Provider configurations based on user preferences [[memory:7262084]]
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    provider: 'openai',
    model: env.openaiModel || 'gpt-4o',
    capabilities: ['text', 'vision', 'realtime'],
    latency: 'low',
    contextWindow: 128000,
    costPerToken: 0.00001
  },
  anthropic: {
    provider: 'anthropic',
    model: env.anthropicModel || 'claude-3-5-sonnet-latest',
    capabilities: ['text', 'vision', 'documents', 'reasoning'],
    latency: 'medium',
    contextWindow: 200000,
    costPerToken: 0.000003
  },
  google: {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    capabilities: ['text', 'vision', 'audio', 'video', 'documents'],
    latency: 'medium',
    contextWindow: 1000000,
    costPerToken: 0.000001
  },
  perplexity: {
    provider: 'perplexity',
    model: 'sonar-pro',
    capabilities: ['research', 'text'],
    latency: 'high',
    contextWindow: 32000,
    costPerToken: 0.000005
  }
}

/**
 * Unified AI Service with intelligent provider selection
 * Chooses the best AI provider based on input type and requirements
 */
export class UnifiedAIService {
  private clients: Map<AIProvider, BaseApiClient>
  private cache: Map<string, { response: AIResponse; timestamp: number }>
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.clients = new Map()
    this.cache = new Map()
    
    // Initialize API clients for each provider
    this.clients.set('openai', new BaseApiClient({
      baseUrl: '/api',
      timeout: 30000,
      retries: 2
    }))
    
    this.clients.set('anthropic', new BaseApiClient({
      baseUrl: '/api',
      timeout: 45000,
      retries: 2
    }))
    
    this.clients.set('google', new BaseApiClient({
      baseUrl: '/api',
      timeout: 60000,
      retries: 2
    }))
    
    this.clients.set('perplexity', new BaseApiClient({
      baseUrl: '/api',
      timeout: 75000,
      retries: 1
    }))
  }

  /**
   * Select the best provider based on input type and requirements
   * Implements the user's preference strategy [[memory:7262084]]
   */
  private selectProvider(request: AIRequest): AIProvider {
    // If user explicitly specified a provider, use it
    if (request.preferredProvider && PROVIDER_CONFIGS[request.preferredProvider]) {
      return request.preferredProvider
    }

    // For research queries, prefer Anthropic (fallbacks handled below)
    if (request.capabilities?.includes('research')) {
      return 'anthropic'
    }

    // Based on input type (following user's strategy)
    switch (request.inputType) {
      case 'image':
        // For vision tasks: OpenAI for low-latency, Anthropic for compliance
        if (request.maxLatency === 'low') {
          return 'openai'
        }
        // Claude for document and compliance-friendly analysis
        return 'anthropic'
        
      case 'audio':
      case 'video':
        // Google Gemini for multimedia with large context
        return 'google'
        
      case 'document':
        // For documents: Gemini for large PDFs, Claude for compliance
        if (request.contextSize && request.contextSize > 200000) {
          return 'google'
        }
        return 'anthropic'
        
      case 'text':
      default:
        // For text: Consider latency and reasoning requirements
        if (request.maxLatency === 'low') {
          return 'openai'
        }
        if (request.capabilities?.includes('reasoning')) {
          return 'anthropic'
        }
        // Default to most cost-effective
        return 'anthropic'
    }
  }

  /**
   * Generate a cache key for the request
   */
  private getCacheKey(request: AIRequest): string {
    const key = {
      prompt: request.prompt,
      inputType: request.inputType,
      provider: request.preferredProvider,
      temperature: request.temperature,
      systemPrompt: request.systemPrompt
    }
    return JSON.stringify(key)
  }

  /**
   * Check and return cached response if valid
   */
  private getCachedResponse(key: string): AIResponse | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('[UnifiedAI] Using cached response')
      return cached.response
    }
    return null
  }

  /**
   * Main method to call AI with intelligent provider selection
   */
  async call(request: AIRequest): Promise<AIResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(request)
    const cachedResponse = this.getCachedResponse(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }

    // Select the best provider
    const provider = this.selectProvider(request)
    const config = PROVIDER_CONFIGS[provider]
    
    console.log(`[UnifiedAI] Selected provider: ${provider} for ${request.inputType || 'text'} input`)

    try {
      let response: AIResponse

      switch (provider) {
        case 'perplexity':
          const perplexityResult = await perplexityService.research(
            request.prompt,
            {
              model: config.model,
              temperature: request.temperature ?? 0.1,
              maxTokens: request.maxTokens ?? 2000
            }
          )
          response = {
            content: perplexityResult.content,
            provider: 'perplexity',
            model: perplexityResult.model || config.model!
          }
          break

        case 'openai':
        case 'anthropic':
          const messages: ChatMessage[] = (request.messages || [
            ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
            { role: 'user', content: request.prompt }
          ]).map(m => ({
            role: (m.role === 'assistant' || m.role === 'system' ? m.role : 'user') as ChatMessage['role'],
            content: m.content
          }))
          
          const llmResult = await llmService.callLLMWithFallback(
            messages,
            {
              temperature: request.temperature ?? 0.7,
              maxTokens: request.maxTokens ?? 4096,
              model: config.model
            },
            {
              primaryProvider: provider,
              fallbackProvider: provider === 'openai' ? 'anthropic' : 'openai'
            }
          )
          
          response = {
            content: llmResult.content,
            provider: llmResult.provider as AIProvider,
            model: llmResult.model || config.model!
          }
          break

        case 'google':
          // TODO: Implement Google Gemini API integration
          throw new AppError('Google Gemini integration not yet implemented', 'NOT_IMPLEMENTED')

        default:
          throw new AppError(`Unknown provider: ${provider}`, 'INVALID_PROVIDER')
      }

      // Cache the response
      this.cache.set(cacheKey, {
        response,
        timestamp: Date.now()
      })

      // Clean old cache entries
      this.cleanCache()

      return response

    } catch (error) {
      console.error(`[UnifiedAI] Error with provider ${provider}:`, error)
      
      // Try fallback providers
      const fallbackProviders = this.getFallbackProviders(provider)
      
      for (const fallback of fallbackProviders) {
        try {
          console.log(`[UnifiedAI] Trying fallback provider: ${fallback}`)
          const fallbackRequest = { ...request, preferredProvider: fallback }
          return await this.call(fallbackRequest)
        } catch (fallbackError) {
          console.error(`[UnifiedAI] Fallback ${fallback} also failed:`, fallbackError)
          continue
        }
      }

      throw error
    }
  }

  /**
   * Get fallback providers for a given provider
   */
  private getFallbackProviders(provider: AIProvider): AIProvider[] {
    switch (provider) {
      case 'openai':
        return ['anthropic', 'google']
      case 'anthropic':
        return ['openai', 'google']
      case 'google':
        return ['anthropic', 'openai']
      case 'perplexity':
        return ['openai', 'anthropic']
      default:
        return ['anthropic', 'openai']
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Specialized method for research queries
   */
  async research(
    query: string,
    options?: {
      model?: string
      maxTokens?: number
      temperature?: number
    }
  ): Promise<AIResponse> {
    return this.call({
      prompt: query,
      inputType: 'text',
      capabilities: ['research'],
      preferredProvider: 'anthropic',
      ...options
    })
  }

  /**
   * Specialized method for document analysis
   */
  async analyzeDocument(
    content: string,
    instructions: string,
    options?: {
      compliance?: boolean
      contextSize?: number
    }
  ): Promise<AIResponse> {
    const provider = options?.compliance ? 'anthropic' : 
                    (options?.contextSize && options.contextSize > 200000) ? 'google' : 
                    'anthropic'
    
    return this.call({
      prompt: instructions,
      inputType: 'document',
      preferredProvider: provider,
      contextSize: options?.contextSize,
      systemPrompt: `You are analyzing a document. The document content is:\n\n${content}\n\nPlease respond to the following instructions:`
    })
  }

  /**
   * Specialized method for vision tasks
   */
  async analyzeImage(
    imageData: string,
    instructions: string,
    options?: {
      lowLatency?: boolean
    }
  ): Promise<AIResponse> {
    // Mark parameter as used for TS noUnusedParameters
    void imageData
    return this.call({
      prompt: instructions,
      inputType: 'image',
      capabilities: ['vision'],
      maxLatency: options?.lowLatency ? 'low' : 'medium',
      systemPrompt: `You are analyzing an image. Please respond to the following instructions about the image.`
    })
  }

  /**
   * Get provider recommendations based on requirements
   */
  getProviderRecommendation(requirements: {
    inputType?: 'text' | 'image' | 'audio' | 'video' | 'document'
    capabilities?: AICapability[]
    maxLatency?: 'low' | 'medium' | 'high'
    contextSize?: number
    budget?: 'low' | 'medium' | 'high'
  }): AIProvider {
    const request: AIRequest = {
      prompt: '',
      ...requirements
    }
    return this.selectProvider(request)
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache.clear()
    console.log('[UnifiedAI] Cache cleared')
  }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService()
