import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function SourceMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown || '_No source content available._'}
      </ReactMarkdown>
    </div>
  )
}


