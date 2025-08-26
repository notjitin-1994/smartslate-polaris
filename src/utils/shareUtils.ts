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
  if (kind === 'starmap') {
    return `${baseUrl}/report/public/starmap/${reportId}`
  }
  return `${baseUrl}/report/public/${reportId}`
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
export function formatShareMessage(link: string, reportTitle?: string): string {
  const title = reportTitle || 'L&D Needs Analysis Report'
  return `Check out this ${title} from SmartSlate Polaris: ${link}`
}
