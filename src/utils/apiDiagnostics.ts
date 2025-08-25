/**
 * API Diagnostics Utility
 * Helps diagnose why API calls are failing
 */

import { perplexityService } from '@/services/perplexityService'
import { callLLM } from '@/services/llmClient'

export interface DiagnosticResult {
  service: string
  status: 'ok' | 'timeout' | 'error' | 'auth_error'
  responseTime?: number
  error?: string
  details?: any
}

/**
 * Test Perplexity API connectivity and configuration
 */
export async function testPerplexityAPI(): Promise<DiagnosticResult> {
  const startTime = Date.now()
  
  try {
    // Simple test prompt
    const result = await Promise.race([
      perplexityService.research('Reply with just the word "test"', {
        model: 'sonar',
        temperature: 0,
        maxTokens: 10
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
      )
    ])
    
    const responseTime = Date.now() - startTime
    
    if (result && result.content) {
      return {
        service: 'perplexity',
        status: 'ok',
        responseTime,
        details: { 
          response: result.content.substring(0, 100),
          model: result.model 
        }
      }
    } else {
      return {
        service: 'perplexity',
        status: 'error',
        responseTime,
        error: 'Empty response'
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    // Check for specific error types
    if (error.message?.includes('Timeout')) {
      return {
        service: 'perplexity',
        status: 'timeout',
        responseTime,
        error: 'API request timed out'
      }
    }
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return {
        service: 'perplexity',
        status: 'auth_error',
        responseTime,
        error: 'Authentication failed - check API key'
      }
    }
    
    if (error.message?.includes('429')) {
      return {
        service: 'perplexity',
        status: 'error',
        responseTime,
        error: 'Rate limit exceeded - too many requests'
      }
    }
    
    if (error.message?.includes('402')) {
      return {
        service: 'perplexity',
        status: 'error',
        responseTime,
        error: 'Payment required - check API credits'
      }
    }
    
    return {
      service: 'perplexity',
      status: 'error',
      responseTime,
      error: error.message || 'Unknown error',
      details: error
    }
  }
}

/**
 * Test Anthropic/OpenAI API connectivity
 */
export async function testLLMAPI(): Promise<DiagnosticResult> {
  const startTime = Date.now()
  
  try {
    const result = await Promise.race([
      callLLM([{
        role: 'user',
        content: 'Reply with just the word "test"'
      }], {
        temperature: 0,
        maxTokens: 10
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
      )
    ])
    
    const responseTime = Date.now() - startTime
    
    if (result && result.content) {
      return {
        service: 'llm',
        status: 'ok',
        responseTime,
        details: { response: result.content.substring(0, 100) }
      }
    } else {
      return {
        service: 'llm',
        status: 'error',
        responseTime,
        error: 'Empty response'
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    if (error.message?.includes('Timeout')) {
      return {
        service: 'llm',
        status: 'timeout',
        responseTime,
        error: 'API request timed out'
      }
    }
    
    return {
      service: 'llm',
      status: 'error',
      responseTime,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Run full diagnostic suite
 */
export async function runFullDiagnostics(): Promise<{
  timestamp: string
  results: DiagnosticResult[]
  recommendations: string[]
}> {
  console.log('🔍 Running API diagnostics...')
  
  const results: DiagnosticResult[] = []
  const recommendations: string[] = []
  
  // Test Perplexity
  console.log('Testing Perplexity API...')
  const perplexityResult = await testPerplexityAPI()
  results.push(perplexityResult)
  
  // Test LLM
  console.log('Testing LLM API...')
  const llmResult = await testLLMAPI()
  results.push(llmResult)
  
  // Generate recommendations
  if (perplexityResult.status === 'timeout') {
    recommendations.push('Perplexity API is slow. Consider using faster models or enabling async mode.')
  }
  
  if (perplexityResult.status === 'auth_error') {
    recommendations.push('Perplexity API key is invalid. Please check your VITE_PERPLEXITY_API_KEY in .env')
  }
  
  if (perplexityResult.status === 'error' && perplexityResult.error?.includes('credits')) {
    recommendations.push('Perplexity API credits may be exhausted. Check your account balance.')
  }
  
  if (perplexityResult.status === 'error' && perplexityResult.error?.includes('Rate limit')) {
    recommendations.push('You are hitting rate limits. Wait a few minutes or upgrade your plan.')
  }
  
  if (results.every(r => r.status === 'timeout')) {
    recommendations.push('All APIs are timing out. Check your internet connection.')
  }
  
  if (results.every(r => r.status === 'error')) {
    recommendations.push('All APIs are failing. Check your API keys and service status.')
  }
  
  // Log results
  console.table(results)
  if (recommendations.length > 0) {
    console.log('📋 Recommendations:')
    recommendations.forEach(r => console.log(`  • ${r}`))
  }
  
  return {
    timestamp: new Date().toISOString(),
    results,
    recommendations
  }
}

/**
 * Get API status display for UI
 */
export function getAPIStatusDisplay(result: DiagnosticResult): {
  color: string
  icon: string
  message: string
} {
  switch (result.status) {
    case 'ok':
      return {
        color: 'green',
        icon: '✅',
        message: `${result.service} is working (${result.responseTime}ms)`
      }
    case 'timeout':
      return {
        color: 'yellow',
        icon: '⏱️',
        message: `${result.service} is very slow or timing out`
      }
    case 'auth_error':
      return {
        color: 'red',
        icon: '🔐',
        message: `${result.service} authentication failed`
      }
    case 'error':
      return {
        color: 'red',
        icon: '❌',
        message: `${result.service} error: ${result.error}`
      }
    default:
      return {
        color: 'gray',
        icon: '❓',
        message: `${result.service} status unknown`
      }
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).polarisAPIDiagnostics = {
    test: runFullDiagnostics,
    testPerplexity: testPerplexityAPI,
    testLLM: testLLMAPI
  }
}
