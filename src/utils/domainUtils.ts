/**
 * Utility functions for handling domain-specific redirects and host detection
 */

/**
 * Detects if the current host is a Polaris subdomain
 */
export function isPolarisHost(): boolean {
  if (typeof window === 'undefined') return false
  
  const host = window.location.hostname.toLowerCase()
  return (
    host === 'polaris.smartslate.io' ||
    host.startsWith('polaris.') ||
    host.startsWith('polaris-') ||
    host.split('.').includes('polaris')
  )
}

/**
 * Gets the appropriate base URL for redirects based on current host
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://app.smartslate.io'
  
  if (isPolarisHost()) {
    return 'https://polaris.smartslate.io'
  }
  
  return 'https://app.smartslate.io'
}

/**
 * Redirects to the appropriate domain for a given path
 */
export function redirectTo(path: string = '/'): void {
  if (typeof window === 'undefined') return
  
  const baseUrl = getBaseUrl()
  const fullPath = path.startsWith('/') ? path : `/${path}`
  window.location.href = `${baseUrl}${fullPath}`
}

/**
 * Gets the appropriate redirect URL for authentication flows
 */
export function getAuthRedirectUrl(): string {
  // Always prefer the current origin so the user stays on the same
  // subdomain they started from (app vs polaris). This avoids issues
  // from misconfigured environment variables.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  // Server-side fallback (rarely used): default to primary app domain
  return 'https://app.smartslate.io/auth/callback'
}
