/**
 * Converts a string to Capital Case (Title Case)
 * Examples:
 * - "john doe" -> "John Doe"
 * - "MARY SMITH" -> "Mary Smith"
 * - "jane-marie o'connor" -> "Jane-Marie O'Connor"
 * - "mc donald" -> "Mc Donald"
 */
export function toCapitalCase(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .toLowerCase()
    .split(/(\s|-|')/) // Split on spaces, hyphens, and apostrophes while preserving delimiters
    .map((word, index, array) => {
      // If this is a delimiter (space, hyphen, apostrophe), keep it as is
      if (word.match(/^\s|-|'$/)) return word
      
      // If this is an empty string, skip it
      if (!word) return word
      
      // Capitalize the first letter of each word
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1)
      
      // Handle special cases for common name prefixes
      const prevWord = index > 0 ? array[index - 2] : '' // Get the word before the delimiter
      const prevDelim = index > 0 ? array[index - 1] : '' // Get the delimiter
      
      // Handle cases like "O'Connor" or "McDonald" where the second part should be capitalized
      if (prevDelim === "'" && prevWord.toLowerCase() === 'o') {
        return capitalized
      }
      if (prevWord.toLowerCase() === 'mc' && prevDelim === ' ') {
        return capitalized
      }
      
      return capitalized
    })
    .join('')
}

/**
 * Extracts and capitalizes the first name from a full name string
 */
export function getCapitalizedFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return ''
  
  const firstName = fullName.trim().split(' ')[0]
  return toCapitalCase(firstName)
}

/**
 * Capitalizes a full name while preserving the full structure
 */
export function getCapitalizedFullName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return ''
  
  return toCapitalCase(fullName)
}

/**
 * Convert a very small, safe subset of Markdown to HTML for in-app display.
 * This is intentionally minimal and avoids external deps.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  let html = markdown
  // Headings
  html = html.replace(/^###\s+(.*)$/gim, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.*)$/gim, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.*)$/gim, '<h1>$1</h1>')
  // Lists (simple)
  html = html.replace(/^\*\s+(.*)$/gim, '<ul><li>$1</li></ul>')
  html = html.replace(/^\-\s+(.*)$/gim, '<ul><li>$1</li></ul>')
  // Bold/italic/inline code
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Paragraph breaks
  html = html.replace(/\n/g, '<br />')
  return html.trim()
}

/**
 * Convert a limited subset of HTML (produced by our editor) back to Markdown.
 * This is best-effort and meant for round-tripping edited content.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  let md = html
  // Normalize legacy <font color> to span style
  md = md.replace(/<font[^>]*color=["']?([^"'>\s]+)["']?[^>]*>/gim, (_m, color) => `<span style="color: ${color}">`)
  md = md.replace(/<\/font>/gim, '</span>')
  // Line breaks
  md = md.replace(/<br\s*\/?\s*>/gim, '\n')
  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gim, '# $1\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gim, '## $1\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gim, '### $1\n')
  // Lists
  md = md.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gim, (match) => {
    return match
      .replace(/<ul[^>]*>/g, '')
      .replace(/<\/ul>/g, '')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gim, '- $1\n')
  })
  // Bold/italic/code
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gim, '**$1**')
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gim, '**$1**')
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gim, '*$1*')
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gim, '*$1*')
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gim, '`$1`')
  // Links
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gim, '[$2]($1)')
  // Preserve span/mark with color styles; strip other tags
  md = md.replace(/<(?!\/?(?:span|mark)\b)[^>]+>/gim, '')
  // Normalize whitespace
  return md
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
