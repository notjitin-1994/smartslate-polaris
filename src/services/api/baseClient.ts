import { NetworkError, AppError } from '@/lib/errors'

export interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Headers
}

/**
 * Base API client with retry logic, timeout, and error handling
 */
export class BaseApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private defaultTimeout: number
  private defaultRetries: number
  private defaultRetryDelay: number
  
  constructor(config: {
    baseUrl?: string
    headers?: Record<string, string>
    timeout?: number
    retries?: number
    retryDelay?: number
  } = {}) {
    this.baseUrl = config.baseUrl || ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    }
    this.defaultTimeout = config.timeout || 30000 // 30 seconds
    this.defaultRetries = config.retries || 3
    this.defaultRetryDelay = config.retryDelay || 1000 // 1 second
  }
  
  /**
   * Make an API request with automatic retries and timeout
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint
    const timeout = config.timeout || this.defaultTimeout
    const retries = config.retries ?? this.defaultRetries
    const retryDelay = config.retryDelay || this.defaultRetryDelay
    
    const headers = {
      ...this.defaultHeaders,
      ...config.headers as Record<string, string>,
    }
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const response = await fetch(url, {
          ...config,
          headers,
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response)
          throw new NetworkError(
            errorData.message || `Request failed with status ${response.status}`,
            { status: response.status, data: errorData }
          )
        }
        
        const data = await this.parseResponse<T>(response)
        
        return {
          data,
          status: response.status,
          headers: response.headers,
        }
      } catch (error: any) {
        lastError = error
        
        // Don't retry on client errors (4xx)
        if (error instanceof NetworkError && error.details?.status >= 400 && error.details?.status < 500) {
          throw error
        }
        
        // Don't retry if aborted
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout', { timeout })
        }
        
        // If it's the last attempt, throw the error
        if (attempt === retries) {
          throw error instanceof AppError
            ? error
            : new NetworkError(error.message || 'Network request failed', { originalError: error })
        }
        
        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * Math.pow(2, attempt))
      }
    }
    
    throw lastError || new NetworkError('Request failed after retries')
  }
  
  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }
  
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
  
  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
  
  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
  
  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
  
  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      return response.json()
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as any
    }
    
    return response.blob() as any
  }
  
  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        return await response.json()
      }
      
      const text = await response.text()
      return { message: text || response.statusText }
    } catch {
      return { message: response.statusText }
    }
  }
  
  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
