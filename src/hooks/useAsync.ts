import { useState, useCallback, useRef, useEffect } from 'react'
import { formatErrorMessage } from '@/lib/errors'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  isSuccess: boolean
  isError: boolean
}

interface UseAsyncOptions {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  retryCount?: number
  retryDelay?: number
}

/**
 * Custom hook for handling async operations with loading states and error handling
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    isSuccess: false,
    isError: false,
  })
  
  const mounted = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  const execute = useCallback(
    async (...args: any[]) => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController()
      
      setState({
        data: null,
        loading: true,
        error: null,
        isSuccess: false,
        isError: false,
      })
      
      let attempts = 0
      const maxAttempts = (options.retryCount || 0) + 1
      
      while (attempts < maxAttempts) {
        try {
          attempts++
          
          // Pass abort signal if the async function supports it
          const result = await asyncFunction(...args, {
            signal: abortControllerRef.current.signal,
          })
          
          if (!mounted.current) return
          
          setState({
            data: result,
            loading: false,
            error: null,
            isSuccess: true,
            isError: false,
          })
          
          options.onSuccess?.(result)
          return result
        } catch (error: any) {
          // If aborted, don't update state
          if (error.name === 'AbortError') {
            return
          }
          
          // If it's the last attempt or component unmounted, set error
          if (attempts >= maxAttempts || !mounted.current) {
            const errorMessage = formatErrorMessage(error)
            
            if (mounted.current) {
              setState({
                data: null,
                loading: false,
                error: errorMessage,
                isSuccess: false,
                isError: true,
              })
              
              options.onError?.(error)
            }
            
            throw error
          }
          
          // Wait before retrying
          if (options.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, options.retryDelay))
          }
        }
      }
    },
    [asyncFunction, options]
  )
  
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isSuccess: false,
      isError: false,
    })
  }, [])
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    reset()
  }, [reset])
  
  return {
    ...state,
    execute,
    reset,
    cancel,
  }
}
