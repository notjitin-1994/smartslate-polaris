/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  code: string
  statusCode?: number
  details?: any
  
  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details)
    this.name = 'AuthError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 500, details)
    this.name = 'NetworkError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'RATE_LIMIT', 429, details)
    this.name = 'RateLimitError'
  }
}

/**
 * Error handler utility
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500)
  }
  
  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500)
}

/**
 * Format error for display to user
 */
export function formatErrorMessage(error: unknown): string {
  const appError = handleError(error)
  
  // Provide user-friendly messages
  switch (appError.code) {
    case 'AUTH_ERROR':
      return 'Authentication failed. Please log in again.'
    case 'VALIDATION_ERROR':
      return appError.message || 'Please check your input and try again.'
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.'
    case 'NOT_FOUND':
      return 'The requested resource was not found.'
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment and try again.'
    default:
      return appError.message || 'Something went wrong. Please try again.'
  }
}
