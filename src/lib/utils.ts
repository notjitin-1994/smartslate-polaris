import { type ClassValue, clsx } from 'clsx'

/**
 * Combines class names using clsx
 * Useful for conditional classes and merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Formats a date string to a human-readable format
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Formats a date with time
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

/**
 * Debounce function to limit the rate at which a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function (this: any, ...args: Parameters<T>) {
    const context = this
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

/**
 * Throttle function to ensure a function is called at most once in a specified period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function (this: any, ...args: Parameters<T>) {
    const context = this
    
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Safely parse JSON with a fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Check if we're running in the browser
 */
export const isBrowser = typeof window !== 'undefined'

/**
 * Check if we're running in development mode
 */
export const isDevelopment = import.meta.env.DEV

/**
 * Check if we're running in production mode
 */
export const isProduction = import.meta.env.PROD
