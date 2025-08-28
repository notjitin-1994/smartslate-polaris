// Stub for shareUtils - provides minimal functionality for frontend

export const generateShareLink = (id: string, type: 'report' | 'starmap' = 'report'): string => {
  console.warn('Backend service removed: generateShareLink')
  return `${window.location.origin}/${type}/${id}`
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
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
      const success = document.execCommand('copy')
      textArea.remove()
      return success
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

export const shareLinkNative = async (url: string, title: string = 'Share'): Promise<boolean> => {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        url
      })
      return true
    } else {
      // Fallback to copying to clipboard
      return await copyToClipboard(url)
    }
  } catch (error) {
    console.error('Failed to share:', error)
    return false
  }
}
