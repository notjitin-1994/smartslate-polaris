import { useState, useRef, useCallback, useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWords?: number
  className?: string
}

interface FormatButton {
  id: string
  label: string
  icon: string
  command: string
  value?: string
}

const formatButtons: FormatButton[] = [
  { id: 'bold', label: 'Bold', icon: 'B', command: 'bold' },
  { id: 'italic', label: 'Italic', icon: 'I', command: 'italic' },
  { id: 'underline', label: 'Underline', icon: 'U', command: 'underline' },
]

const listButtons: FormatButton[] = [
  { id: 'bulletList', label: 'Bullet List', icon: '•', command: 'insertUnorderedList' },
  { id: 'numberList', label: 'Number List', icon: '1.', command: 'insertOrderedList' },
]

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start writing...', 
  maxWords = 300,
  className = ''
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [lastGoodContent, setLastGoodContent] = useState(value)
  const isUpdatingFromProps = useRef(false)
  
  const getWordCount = useCallback((html: string): number => {
    // Strip HTML tags and count words
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (!text) return 0
    return text.split(/\s+/).length
  }, [])

  const currentWordCount = getWordCount(value)

  // Update editor content when value prop changes (but not during user typing)
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromProps.current && editorRef.current.innerHTML !== value) {
      const selection = window.getSelection()
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null
      const startOffset = range?.startOffset || 0
      const endOffset = range?.endOffset || 0
      
      editorRef.current.innerHTML = value
      setLastGoodContent(value)
      
      // Try to restore cursor position
      try {
        if (range && selection) {
          const newRange = document.createRange()
          const textNode = editorRef.current.firstChild
          if (textNode) {
            newRange.setStart(textNode, Math.min(startOffset, textNode.textContent?.length || 0))
            newRange.setEnd(textNode, Math.min(endOffset, textNode.textContent?.length || 0))
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      } catch {
        // Ignore cursor restoration errors
      }
    }
  }, [value])

  const executeCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand(command, false, value)
      
      // Update content after command
      const newContent = editorRef.current.innerHTML
      if (getWordCount(newContent) <= maxWords) {
        isUpdatingFromProps.current = true
        onChange(newContent)
        setLastGoodContent(newContent)
        setTimeout(() => {
          isUpdatingFromProps.current = false
        }, 0)
      }
    }
  }

  const handleInput = () => {
    if (editorRef.current && !isUpdatingFromProps.current) {
      const newContent = editorRef.current.innerHTML
      const wordCount = getWordCount(newContent)
      
      if (wordCount <= maxWords) {
        isUpdatingFromProps.current = true
        onChange(newContent)
        setLastGoodContent(newContent)
        setTimeout(() => {
          isUpdatingFromProps.current = false
        }, 0)
      } else {
        // Revert to last good content if word limit exceeded
        editorRef.current.innerHTML = lastGoodContent
        
        // Try to maintain cursor at end
        try {
          const selection = window.getSelection()
          if (selection && editorRef.current.lastChild) {
            const range = document.createRange()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        } catch {
          // Ignore cursor positioning errors
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          executeCommand('bold')
          break
        case 'i':
          e.preventDefault()
          executeCommand('italic')
          break
        case 'u':
          e.preventDefault()
          executeCommand('underline')
          break
      }
    }
  }

  const isButtonActive = (command: string): boolean => {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      executeCommand('createLink', url)
    }
  }

  const removeFormat = () => {
    executeCommand('removeFormat')
  }

  return (
    <div className={`border border-white/10 rounded-lg overflow-hidden bg-white/5 ${isFocused ? 'ring-2 ring-primary-400 border-primary-400' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-white/5">
        {/* Text formatting */}
        <div className="flex items-center">
          {formatButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                isButtonActive(button.command)
                  ? 'bg-primary-300/20 text-primary-900 border border-primary-400/30 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Lists */}
        <div className="flex items-center">
          {listButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                isButtonActive(button.command)
                  ? 'bg-primary-300/20 text-primary-900 border border-primary-400/30 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Link and clear formatting */}
        <button
          type="button"
          onClick={addLink}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Add Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={removeFormat}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Clear Formatting"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Word count */}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`${currentWordCount > maxWords * 0.9 ? 'text-yellow-400' : currentWordCount >= maxWords ? 'text-red-400' : 'text-white/60'}`}>
            {currentWordCount}/{maxWords} words
          </span>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className="min-h-[120px] p-3 text-sm text-white/90 outline-none resize-none overflow-y-auto max-h-[300px]"
        style={{
          lineHeight: '1.5',
        }}
        data-placeholder={placeholder}
      />

      {/* Custom styles for the editor */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }
        
        [contenteditable] strong,
        .prose strong {
          font-weight: 600;
          color: #a7dadb !important;
        }
        
        [contenteditable] em,
        .prose em {
          font-style: italic;
        }
        
        [contenteditable] u,
        .prose u {
          text-decoration: underline;
          color: #a7dadb !important;
        }
        
        [contenteditable] a,
        .prose a {
          color: #a7dadb;
          text-decoration: underline;
        }
        
        /* Brand accent teal for active buttons */
        .text-primary-900 {
          color: #a7dadb !important;
        }
        
        [contenteditable] ul, [contenteditable] ol,
        .prose ul, .prose ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        [contenteditable] li,
        .prose li {
          margin: 0.25rem 0;
        }
        
        [contenteditable] p,
        .prose p {
          margin: 0.5rem 0;
        }
        
        [contenteditable] p:first-child,
        .prose p:first-child {
          margin-top: 0;
        }
        
        [contenteditable] p:last-child,
        .prose p:last-child {
          margin-bottom: 0;
        }

        /* Override prose defaults for bio display */
        .prose {
          max-width: none;
        }
        
        .prose ul li::marker,
        .prose ol li::marker {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  )
}
