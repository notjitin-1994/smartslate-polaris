import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Dev-only: track which element IDs we've already logged to avoid spam
const __loggedMarkdownIds: Set<string> = new Set()

function synthesizeMarkdownFromObject(obj: any): string {
  if (!obj || typeof obj !== 'object') return ''
  const lines: string[] = []
  const appendKV = (k: string, v: any) => {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) {
      if (!v.length) return
      lines.push(`### ${toTitle(k)}`)
      v.forEach((item) => {
        if (typeof item === 'string') lines.push(`- ${item}`)
        else lines.push(`- ${JSON.stringify(item)}`)
      })
      lines.push('')
    } else if (typeof v === 'object') {
      lines.push(`**${toTitle(k)}**:`)
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(v, null, 2))
      lines.push('```')
      lines.push('')
    } else {
      lines.push(`- **${toTitle(k)}**: ${String(v)}`)
    }
  }
  const toTitle = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  Object.keys(obj).forEach((k) => {
    if (k === 'markdown') return
    appendKV(k, (obj as any)[k])
  })
  return lines.join('\n')
}

export default function MarkdownBlock({ spec }: { spec: any }) {
  let markdown: string = spec?.data?.markdown || ''
  if (!markdown) {
    markdown = synthesizeMarkdownFromObject(spec?.data)
    const debugEnabled = (import.meta as any)?.env?.VITE_DEBUG_STARMAP === '1' || (import.meta as any)?.env?.VITE_DEBUG_STARMAP === 'true'
    if (import.meta.env.DEV && debugEnabled) {
      const id = String(spec?.id || '')
      if (!__loggedMarkdownIds.has(id)) {
        try {
          // eslint-disable-next-line no-console
          console.info('[dev] Markdown synthesized from object for element', { id: spec?.id, keys: Object.keys(spec?.data || {}) })
        } catch {}
        __loggedMarkdownIds.add(id)
      }
    }
  }
  return (
    <div className="prose prose-invert max-w-none glass-card p-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown || '_No content_'}
      </ReactMarkdown>
    </div>
  )
}


