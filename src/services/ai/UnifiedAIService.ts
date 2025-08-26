import { BaseApiClient } from '@/services/api/baseClient'
import { env } from '@/config/env'
import { getSupabase } from '@/lib/supabaseClient'

const supabase = getSupabase()

// Types
export interface AIProvider {
  name: 'openai' | 'anthropic' | 'perplexity' | 'gemini'
  models: string[]
  capabilities: string[]
  maxTokens: number
  rateLimit: number
  costPer1kTokens: number
}

export interface AIRequest {
  task: 'research' | 'analysis' | 'generation' | 'question' | 'summarization'
  prompt: string
  context?: Record<string, any>
  maxTokens?: number
  temperature?: number
  model?: string
  provider?: string
  cacheKey?: string
  cacheDuration?: number // in seconds
  priority?: 'low' | 'normal' | 'high'
  timeout?: number
}

export interface AIResponse {
  content: string
  provider: string
  model: string
  cached: boolean
  tokens: number
  latency: number
  cost: number
}

// Provider configurations - optimized based on user memory preferences
const PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
    capabilities: ['vision', 'realtime', 'multimodal', 'streaming'],
    maxTokens: 128000,
    rateLimit: 10000, // requests per minute
    costPer1kTokens: 0.01
  },
  anthropic: {
    name: 'anthropic',
    models: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-3-opus-latest'],
    capabilities: ['documents', 'compliance', 'analysis', 'long-context'],
    maxTokens: 200000,
    rateLimit: 5000,
    costPer1kTokens: 0.003
  },
  perplexity: {
    name: 'perplexity',
    models: ['sonar', 'sonar-pro', 'sonar-reasoning'],
    capabilities: ['research', 'web-search', 'real-time-data'],
    maxTokens: 4096,
    rateLimit: 1000,
    costPer1kTokens: 0.002
  },
  gemini: {
    name: 'gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    capabilities: ['images', 'audio', 'video', 'large-context', 'enterprise'],
    maxTokens: 1000000,
    rateLimit: 2000,
    costPer1kTokens: 0.0025
  }
}

// Task to provider mapping based on user preferences [[memory:7262084]]
const TASK_PROVIDER_MAP: Record<string, string[]> = {
  research: ['perplexity', 'gemini', 'openai'],
  analysis: ['anthropic', 'gemini', 'openai'],
  generation: ['anthropic', 'openai', 'gemini'],
  question: ['anthropic', 'openai', 'perplexity'],
  summarization: ['anthropic', 'gemini', 'openai'],
  vision: ['openai', 'gemini', 'anthropic'],
  compliance: ['anthropic', 'gemini'],
  documents: ['gemini', 'anthropic'],
  multimodal: ['openai', 'gemini']
}

/**
 * Unified AI Service with intelligent provider selection and caching
 */
export class UnifiedAIService {
  private clients: Map<string, BaseApiClient> = new Map()
  private cache: Map<string, { response: AIResponse; expiry: number }> = new Map()
  private requestQueue: Map<string, Promise<any>> = new Map()
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map()
  
  constructor() {
    this.initializeClients()
    this.startCacheCleanup()
  }
  
  private initializeClients() {
    // Initialize API clients for each provider
    this.clients.set('openai', new BaseApiClient({
      baseUrl: '/api',
      timeout: 60000,
      retries: 2,
      retryDelay: 1000
    }))
    
    this.clients.set('anthropic', new BaseApiClient({
      baseUrl: '/api',
      timeout: 60000,
      retries: 2,
      retryDelay: 1000
    }))
    
    this.clients.set('perplexity', new BaseApiClient({
      baseUrl: '/api',
      timeout: 75000,
      retries: 3,
      retryDelay: 1500
    }))
    
    this.clients.set('gemini', new BaseApiClient({
      baseUrl: '/api',
      timeout: 90000,
      retries: 2,
      retryDelay: 2000
    }))
  }
  
  /**
   * Main method to make AI requests with intelligent routing
   */
  async request(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()
    
    // Check cache first
    if (request.cacheKey) {
      const cached = this.getCached(request.cacheKey)
      if (cached) {
        return { ...cached, cached: true, latency: Date.now() - startTime }
      }
    }
    
    // Deduplicate concurrent identical requests
    const dedupeKey = this.getDedupeKey(request)
    if (this.requestQueue.has(dedupeKey)) {
      return await this.requestQueue.get(dedupeKey)
    }
    
    // Create promise for this request
    const requestPromise = this.executeRequest(request, startTime)
    this.requestQueue.set(dedupeKey, requestPromise)
    
    try {
      const response = await requestPromise
      
      // Cache successful response
      if (request.cacheKey && request.cacheDuration) {
        this.setCached(request.cacheKey, response, request.cacheDuration)
      }
      
      return response
    } finally {
      // Clean up request queue
      this.requestQueue.delete(dedupeKey)
    }
  }
  
  /**
   * Execute the actual AI request
   */
  private async executeRequest(request: AIRequest, startTime: number): Promise<AIResponse> {
    // Select best provider based on task and capabilities
    const provider = this.selectProvider(request)
    const model = this.selectModel(provider, request)
    
    // Check rate limits
    await this.checkRateLimit(provider)
    
    // Prepare request based on provider
    const apiRequest = this.prepareRequest(provider, model, request)
    
    try {
      // Make the API call
      const client = this.clients.get(provider)
      if (!client) throw new Error(`No client for provider: ${provider}`)
      
      const response = await client.post(`/${provider}`, apiRequest, {
        timeout: request.timeout || 60000,
        retries: request.priority === 'high' ? 3 : 2
      })
      
      // Extract content based on provider response format
      const content = this.extractContent(provider, response.data)
      
      // Calculate metrics
      const tokens = this.estimateTokens(content)
      const cost = this.calculateCost(provider, tokens)
      const latency = Date.now() - startTime
      
      // Log to database for analytics
      await this.logRequest(request, provider, model, tokens, cost, latency)
      
      return {
        content,
        provider,
        model,
        cached: false,
        tokens,
        latency,
        cost
      }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error)
      
      // Try fallback provider
      const fallbackProvider = this.getFallbackProvider(provider, request.task)
      if (fallbackProvider && fallbackProvider !== provider) {
        console.log(`Falling back to ${fallbackProvider}`)
        return this.executeRequest({ ...request, provider: fallbackProvider }, startTime)
      }
      
      throw error
    }
  }
  
  /**
   * Select the best provider for the task based on user preferences [[memory:7262084]]
   */
  private selectProvider(request: AIRequest): string {
    if (request.provider && PROVIDERS[request.provider]) {
      return request.provider
    }
    
    // Check for specific content types
    if (request.context?.hasImages || request.context?.hasVideo) {
      // Use Gemini for multimedia content [[memory:7262084]]
      return 'gemini'
    }
    
    if (request.context?.requiresCompliance || request.context?.hasPDF) {
      // Use Anthropic for compliance and document analysis [[memory:7262084]]
      return 'anthropic'
    }
    
    if (request.context?.requiresRealtime || request.context?.requiresVision) {
      // Use OpenAI for real-time and vision tasks [[memory:7262084]]
      return 'openai'
    }
    
    // Get providers for task type
    const taskProviders = TASK_PROVIDER_MAP[request.task] || ['anthropic', 'openai']
    
    // Select based on availability and performance
    for (const provider of taskProviders) {
      if (this.isProviderAvailable(provider)) {
        return provider
      }
    }
    
    return 'anthropic' // Default fallback
  }
  
  /**
   * Select optimal model for the provider and task
   */
  private selectModel(provider: string, request: AIRequest): string {
    if (request.model) return request.model
    
    const providerConfig = PROVIDERS[provider]
    if (!providerConfig) return 'default'
    
    // Select model based on task complexity and requirements
    switch (provider) {
      case 'openai':
        if (request.context?.requiresReasoning) return 'o1-preview'
        if (request.maxTokens && request.maxTokens > 16000) return 'gpt-4o'
        return 'gpt-4o-mini'
        
      case 'anthropic':
        if (request.context?.requiresLatest) return 'claude-3-7-sonnet-latest'
        return 'claude-3-5-sonnet-latest'
        
      case 'perplexity':
        if (request.task === 'research' && request.context?.requiresDepth) return 'sonar-pro'
        if (request.context?.requiresReasoning) return 'sonar-reasoning'
        return 'sonar'
        
      case 'gemini':
        if (request.maxTokens && request.maxTokens > 100000) return 'gemini-1.5-pro'
        if (request.context?.requiresSpeed) return 'gemini-2.0-flash'
        return 'gemini-1.5-flash'
        
      default:
        return providerConfig.models[0]
    }
  }
  
  /**
   * Prepare request payload for specific provider
   */
  private prepareRequest(provider: string, model: string, request: AIRequest): any {
    const basePayload = {
      model,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 2000
    }
    
    switch (provider) {
      case 'openai':
      case 'anthropic':
        return {
          ...basePayload,
          messages: [
            ...(request.context?.systemPrompt ? [{ role: 'system', content: request.context.systemPrompt }] : []),
            { role: 'user', content: request.prompt }
          ]
        }
        
      case 'perplexity':
        // Perplexity doesn't support system role, include in user message
        const contextualPrompt = request.context?.systemPrompt 
          ? `${request.context.systemPrompt}\n\n${request.prompt}`
          : request.prompt
        return {
          ...basePayload,
          messages: [{ role: 'user', content: contextualPrompt }]
        }
        
      case 'gemini':
        return {
          ...basePayload,
          contents: [
            {
              parts: [{ text: request.prompt }],
              role: 'user'
            }
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens || 2000
          }
        }
        
      default:
        return basePayload
    }
  }
  
  /**
   * Extract content from provider response
   */
  private extractContent(provider: string, response: any): string {
    switch (provider) {
      case 'openai':
      case 'perplexity':
        return response?.choices?.[0]?.message?.content || ''
        
      case 'anthropic':
        return response?.content?.[0]?.text || response?.completion || ''
        
      case 'gemini':
        return response?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
      default:
        return response?.content || response?.text || ''
    }
  }
  
  /**
   * Check if provider is available
   */
  private isProviderAvailable(provider: string): boolean {
    const config = PROVIDERS[provider]
    if (!config) return false
    
    // Check if API key is configured
    let apiKey: string | undefined
    switch (provider) {
      case 'openai':
        apiKey = env.openaiApiKey
        break
      case 'anthropic':
        apiKey = env.anthropicApiKey
        break
      case 'perplexity':
        apiKey = env.perplexityApiKey
        break
      case 'gemini':
        // Gemini API key not currently wired in env.ts; treat as unavailable
        apiKey = undefined
        break
      default:
        apiKey = undefined
    }
    return !!apiKey
  }
  
  /**
   * Get fallback provider for a task
   */
  private getFallbackProvider(currentProvider: string, task: string): string | null {
    const providers = TASK_PROVIDER_MAP[task] || []
    const index = providers.indexOf(currentProvider)
    
    if (index >= 0 && index < providers.length - 1) {
      return providers[index + 1]
    }
    
    return null
  }
  
  /**
   * Rate limiting check
   */
  private async checkRateLimit(provider: string): Promise<void> {
    const limiter = this.rateLimiters.get(provider)
    const now = Date.now()
    
    if (!limiter) {
      this.rateLimiters.set(provider, { count: 1, resetAt: now + 60000 })
      return
    }
    
    if (now > limiter.resetAt) {
      limiter.count = 1
      limiter.resetAt = now + 60000
      return
    }
    
    const config = PROVIDERS[provider]
    if (limiter.count >= config.rateLimit) {
      const waitTime = limiter.resetAt - now
      await new Promise(resolve => setTimeout(resolve, waitTime))
      limiter.count = 1
      limiter.resetAt = now + 60000
    } else {
      limiter.count++
    }
  }
  
  /**
   * Cache management
   */
  private getCached(key: string): AIResponse | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return cached.response
  }
  
  private setCached(key: string, response: AIResponse, duration: number) {
    this.cache.set(key, {
      response,
      expiry: Date.now() + (duration * 1000)
    })
  }
  
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.cache.entries()) {
        if (now > value.expiry) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Clean up every minute
  }
  
  /**
   * Generate deduplication key
   */
  private getDedupeKey(request: AIRequest): string {
    return `${request.task}:${request.prompt.substring(0, 100)}:${request.provider || 'auto'}`
  }
  
  /**
   * Estimate token count
   */
  private estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4)
  }
  
  /**
   * Calculate cost
   */
  private calculateCost(provider: string, tokens: number): number {
    const config = PROVIDERS[provider]
    if (!config) return 0
    
    return (tokens / 1000) * config.costPer1kTokens
  }
  
  /**
   * Log request for analytics
   */
  private async logRequest(
    request: AIRequest,
    provider: string,
    model: string,
    tokens: number,
    cost: number,
    latency: number
  ): Promise<void> {
    try {
      await supabase.from('ai_request_logs').insert({
        task: request.task,
        provider,
        model,
        tokens,
        cost,
        latency,
        cached: false,
        priority: request.priority || 'normal',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log AI request:', error)
    }
  }
  
  /**
   * Batch process multiple requests in parallel
   */
  async batchRequest(requests: AIRequest[]): Promise<AIResponse[]> {
    // Group requests by provider for efficiency
    const groupedRequests = new Map<string, AIRequest[]>()
    
    for (const request of requests) {
      const provider = this.selectProvider(request)
      const group = groupedRequests.get(provider) || []
      group.push(request)
      groupedRequests.set(provider, group)
    }
    
    // Process all requests in parallel
    const allPromises: Promise<AIResponse>[] = []
    
    for (const [provider, providerRequests] of groupedRequests.entries()) {
      // Rate limit within provider group
      const batchSize = Math.min(5, Math.floor(PROVIDERS[provider].rateLimit / 100))
      
      for (let i = 0; i < providerRequests.length; i += batchSize) {
        const batch = providerRequests.slice(i, i + batchSize)
        const batchPromises = batch.map(req => this.request(req))
        allPromises.push(...batchPromises)
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < providerRequests.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
    
    return Promise.all(allPromises)
  }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService()
