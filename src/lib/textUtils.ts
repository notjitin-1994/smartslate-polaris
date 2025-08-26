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
  
  const lines = markdown.split('\n')
  // Build citation map like: [1] Title — https://example.com or [1]: https://...
  const citationMap: Record<string, string> = {}
  for (const raw of lines) {
    const line = raw.trim()
    let m = line.match(/^\[(\d+)\][\s:–-]*.*?(https?:\/\/\S+)/)
    if (m) {
      citationMap[m[1]] = m[2]
      continue
    }
    m = line.match(/^\[(\d+)\]:\s*(https?:\/\/\S+)/)
    if (m) {
      citationMap[m[1]] = m[2]
    }
  }

  const convertInline = (text: string): string => {
    let t = text
    // Markdown links [text](url)
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>')
    // Autolink raw URLs
    t = t.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1<\/a>')
    // Numeric citations [1] [2]
    t = t.replace(/\[(\d+)\](?!\()/g, (_m, n) => citationMap[n] ? `<a href="${citationMap[n]}" target="_blank" rel="noopener noreferrer">[${n}]<\/a>` : `[${n}]`)
    // Bold/italic/code
    t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1<\/strong>')
      .replace(/\*(.*?)\*/g, '<em>$1<\/em>')
      .replace(/`([^`]+)`/g, '<code class="bg-white\/10 px-1 py-0.5 rounded text-sm">$1<\/code>')
    return t
  }
  let html = ''
  let inList = false
  let listType = ''
  let inTable = false
  let tableHeaders: string[] = []
  // let tableRows: string[][] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Handle list items
    if (line.match(/^[\*\-\+]\s+(.+)$/)) {
      const content = convertInline(line.replace(/^[\*\-\+]\s+/, ''))
      if (!inList) {
        html += '<ul>'
        inList = true
        listType = 'ul'
      }
      html += `<li>${content}</li>`
      continue
    }
    
    // Handle numbered list items
    if (line.match(/^\d+\.\s+(.+)$/)) {
      const content = convertInline(line.replace(/^\d+\.\s+/, ''))
      if (!inList) {
        html += '<ol>'
        inList = true
        listType = 'ol'
      } else if (listType !== 'ol') {
        // Close previous list and start new ordered list
        html += `</${listType}>`
        html += '<ol>'
        listType = 'ol'
      }
      html += `<li>${content}</li>`
      continue
    }
    
    // Handle table headers
    if (line.match(/^\|(.+)\|$/) && line.includes('|')) {
      if (!inTable) {
        inTable = true
        tableHeaders = line.split('|').slice(1, -1).map(cell => cell.trim())
        html += '<table class="border-collapse border border-white/20 w-full my-4">'
        html += '<thead><tr>'
        tableHeaders.forEach(header => {
          html += `<th class="border border-white/20 px-3 py-2 text-left bg-white/5">${header}</th>`
        })
        html += '</tr></thead><tbody>'
        continue
      }
    }
    
    // Handle table rows
    if (inTable && line.match(/^\|(.+)\|$/)) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
      html += '<tr>'
      cells.forEach(cell => {
        html += `<td class="border border-white/20 px-3 py-2">${cell}</td>`
      })
      html += '</tr>'
      continue
    }
    
    // Handle table separator line (markdown table syntax)
    if (inTable && line.match(/^\|[\s\-\|:]+\|$/)) {
      continue // Skip separator lines
    }
    
    // Close table if we're no longer in table context
    if (inTable && !line.match(/^\|(.+)\|$/)) {
      html += '</tbody></table>'
      inTable = false
    }
    
    // Close list if we're no longer in list context
    if (inList && !line.match(/^[\*\-\+]\s+(.+)$/) && !line.match(/^\d+\.\s+(.+)$/)) {
      html += `</${listType}>`
      inList = false
      listType = ''
    }
    
    // Handle headings
    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>`
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`
    } else if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`
    }
    // Handle bold/italic/inline code
    else if (line.includes('**') || line.includes('*') || line.includes('`') || line.includes('](') || line.includes('http')) {
      html += `<p>${convertInline(line)}</p>`
    }
    // Handle empty lines
    else if (line === '') {
      html += '<br />'
    }
    // Handle regular text
    else if (line) {
      html += `<p>${line}</p>`
    }
  }
  
  // Close any open lists or tables
  if (inList) {
    html += `</${listType}>`
  }
  if (inTable) {
    html += '</tbody></table>'
  }
  
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
  
  // Handle tables
  md = md.replace(/<table[^>]*>[\s\S]*?<\/table>/gim, (match) => {
    const rows: string[] = []
    const headerMatch = match.match(/<thead[^>]*>[\s\S]*?<\/thead>/gim)
    const bodyMatch = match.match(/<tbody[^>]*>[\s\S]*?<\/tbody>/gim)
    
    // Extract headers
    if (headerMatch) {
      const headerCells = headerMatch[0].match(/<th[^>]*>([\s\S]*?)<\/th>/gim)
      if (headerCells) {
        const headers = headerCells.map(cell => cell.replace(/<th[^>]*>([\s\S]*?)<\/th>/gim, '$1').trim())
        rows.push(`|${headers.join('|')}|`)
        rows.push(`|${headers.map(() => '---').join('|')}|`)
      }
    }
    
    // Extract body rows
    if (bodyMatch) {
      const bodyRows = bodyMatch[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gim)
      if (bodyRows) {
        bodyRows.forEach(row => {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gim)
          if (cells) {
            const cellContents = cells.map(cell => cell.replace(/<td[^>]*>([\s\S]*?)<\/td>/gim, '$1').trim())
            rows.push(`|${cellContents.join('|')}|`)
          }
        })
      }
    }
    
    return rows.join('\n')
  })
  
  // Line breaks
  md = md.replace(/<br\s*\/?\s*>/gim, '\n')
  
  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gim, '# $1\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gim, '## $1\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gim, '### $1\n')
  
  // Lists - handle both ul and ol properly
  md = md.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gim, (match) => {
    return match
      .replace(/<ul[^>]*>/g, '')
      .replace(/<\/ul>/g, '')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gim, '- $1\n')
      .trim()
  })
  
  md = md.replace(/<ol[^>]*>[\s\S]*?<\/ol>/gim, (match) => {
    let counter = 1
    return match
      .replace(/<ol[^>]*>/g, '')
      .replace(/<\/ol>/g, '')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gim, () => `${counter++}. $1\n`)
      .trim()
  })
  
  // Bold/italic/code
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gim, '**$1**')
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gim, '**$1**')
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gim, '*$1*')
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gim, '*$1*')
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gim, '`$1`')
  
  // Links
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gim, '[$2]($1)')
  // Convert citation-style anchors like <a href="url">[1]</a> back to [1] (we preserve URL elsewhere)
  md = md.replace(/\[(\d+)\]\((https?:[^)]+)\)/gim, '[$1] ($2)')
  
  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gim, '$1\n')
  
  // Preserve span/mark with color styles; strip other tags
  md = md.replace(/<(?!\/?(?:span|mark)\b)[^>]+>/gim, '')
  
  // Normalize whitespace
  return md
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
