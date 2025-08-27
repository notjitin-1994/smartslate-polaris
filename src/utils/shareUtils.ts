/**
 * Utility functions for generating and managing share links
 */

/**
 * Generate a public share link for a report
 * @param reportId The ID of the report to share
 * @returns The full URL for the public report
 */
export function generateShareLink(reportId: string, options?: { kind?: 'summary' | 'starmap' }): string {
  const baseUrl = window.location.origin
  const kind = options?.kind || 'summary'
  // Use meta endpoint to serve OG tags for richer previews; it will redirect to public view
  const params = new URLSearchParams({ id: reportId, kind })
  return `${baseUrl}/api/share/meta?${params.toString()}`
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text The text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern way
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Format a share message with the report link
 * @param link The share link
 * @param reportTitle Optional report title
 * @returns Formatted share message
 */
export function formatShareMessage(link: string, _reportTitle?: string): string {
  // WhatsApp requirement: only send the link to avoid unwanted preface text
  return link
}

/**
 * Attempt to share via the Web Share API with graceful fallbacks.
 * - On iPad/iOS Safari and modern mobile browsers, this opens the native share sheet.
 * - If Web Share is unavailable or fails, we fall back to copying to clipboard.
 */
export async function shareLinkNative(options: { url: string; title?: string; text?: string }): Promise<'shared' | 'copied' | 'failed'> {
  const { url, title = 'SmartSlate Polaris', text } = options
  try {
    const canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'
    if (canShare) {
      await (navigator as any).share({ url, title, text: text ?? formatShareMessage(url) })
      return 'shared'
    }
  } catch (err) {
    // Some browsers throw if user cancels share; treat as failure and continue to clipboard
  }
  const copied = await copyToClipboard(url)
  return copied ? 'copied' : 'failed'
}
