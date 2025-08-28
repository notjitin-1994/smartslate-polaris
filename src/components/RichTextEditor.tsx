import { useState, useRef, useCallback, useEffect, memo, type ReactNode } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWords?: number
  autoGrow?: boolean
  maxHeight?: number
  className?: string
  readOnly?: boolean
  // When true, applies a denser DOS-like look (compact spacing, monospaced font)
  compactDosStyle?: boolean
  // When true, the toolbar floats/sticks at the top of the scroll container
  floatingToolbar?: boolean
  // Show the fullscreen toggle button
  showFullscreen?: boolean
  // Start collapsed (single-tile card)
  collapsedInitially?: boolean
}

interface FormatButton {
  id: string
  label: string
  command: string
  value?: string
}

const formatButtons: FormatButton[] = [
  { id: 'bold', label: 'Bold', command: 'bold' },
  { id: 'italic', label: 'Italic', command: 'italic' },
  { id: 'underline', label: 'Underline', command: 'underline' },
]

const listButtons: FormatButton[] = [
  { id: 'bulletList', label: 'Bulleted list', command: 'insertUnorderedList' },
  { id: 'numberList', label: 'Numbered list', command: 'insertOrderedList' },
]

// Memoized ToolbarGroup component for better performance
const ToolbarGroup = memo(({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-3 mr-4 px-3 py-2 rounded-2xl border border-white/10 bg-white/5">
    <div className="hidden md:block text-[10px] uppercase tracking-wide text-white/50 mr-3 select-none">
      {label}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
))

ToolbarGroup.displayName = 'ToolbarGroup'

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start writing...', 
  maxWords,
  autoGrow = true,
  maxHeight,
  className = '',
  readOnly = false,
  compactDosStyle = false,
  floatingToolbar = false,
  showFullscreen = true,
  collapsedInitially = false
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastGoodContent, setLastGoodContent] = useState(value)
  const isUpdatingFromProps = useRef(false)
  const [overflowY, setOverflowY] = useState<'auto' | 'hidden'>('hidden')
  const [isTextColorOpen, setIsTextColorOpen] = useState(false)
  const [isHighlightColorOpen, setIsHighlightColorOpen] = useState(false)
  const textColorRef = useRef<HTMLDivElement | null>(null)
  const highlightColorRef = useRef<HTMLDivElement | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const helpRef = useRef<HTMLDivElement | null>(null)
  const [isTableGridOpen, setIsTableGridOpen] = useState(false)
  const tableGridRef = useRef<HTMLDivElement | null>(null)
  const [gridRowsHover, setGridRowsHover] = useState(0)
  const [gridColsHover, setGridColsHover] = useState(0)
  const [tableContext, setTableContext] = useState<{ table: HTMLTableElement | null; rowIndex: number; colIndex: number; colsCount: number; rowsCount: number }>({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 })
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(collapsedInitially)
  
  const getWordCount = useCallback((html: string): number => {
    // Strip HTML tags and count words
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (!text) return 0
    return text.split(/\s+/).length
  }, [])

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
      if (readOnly) return
      editorRef.current.focus()
      document.execCommand(command, false, value)
      
      // Update content after command
      const newContent = editorRef.current.innerHTML
      if (typeof maxWords !== 'number' || getWordCount(newContent) <= maxWords) {
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
      
      if (typeof maxWords !== 'number' || wordCount <= maxWords) {
        isUpdatingFromProps.current = true
        onChange(newContent)
        setLastGoodContent(newContent)
        setTimeout(() => {
          isUpdatingFromProps.current = false
        }, 0)
        if (autoGrow && !isFullscreen) {
          autoResize()
        }
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
        case 'z':
          // Let browser handle undo
          break
        case 'y':
          // Let browser handle redo
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

  const toggleBlockquote = () => {
    try {
      document.execCommand('formatBlock', false, 'blockquote')
    } catch {}
  }

  const toggleCodeBlock = () => {
    if (!editorRef.current) return
    try {
      document.execCommand('formatBlock', false, 'pre')
    } catch {
      // Fallback: insert pre wrapper
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const pre = document.createElement('pre')
        pre.textContent = range.toString() || 'code'
        range.deleteContents()
        range.insertNode(pre)
      }
    }
  }

  const applyBlock = (tagName: 'p' | 'h1' | 'h2' | 'pre' | 'blockquote') => {
    if (!editorRef.current || readOnly) return
    editorRef.current.focus()
    try {
      document.execCommand('formatBlock', false, tagName)
    } catch {
      try {
        document.execCommand('formatBlock', false, `<${tagName.toUpperCase()}>`)
      } catch {}
    }
    const newContent = editorRef.current.innerHTML
    if (typeof maxWords !== 'number' || getWordCount(newContent) <= maxWords) {
      isUpdatingFromProps.current = true
      onChange(newContent)
      setLastGoodContent(newContent)
      setTimeout(() => { isUpdatingFromProps.current = false }, 0)
    } else {
      editorRef.current.innerHTML = lastGoodContent
    }
  }

  const getIcon = (id: string) => {
    switch (id) {
      case 'bold':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 12.5a4.5 4.5 0 0 0 0-9H7v18h7a4.5 4.5 0 0 0 0-9H7" />
          </svg>
        )
      case 'italic':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        )
      case 'underline':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3v6a6 6 0 0 0 12 0V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
          </svg>
        )
      case 'bulletList':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="4" cy="12" r="1" />
            <circle cx="4" cy="18" r="1" />
          </svg>
        )
      case 'numberList':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <text x="3" y="7" fontSize="6" fill="currentColor">1</text>
            <text x="3" y="13" fontSize="6" fill="currentColor">2</text>
            <text x="3" y="19" fontSize="6" fill="currentColor">3</text>
          </svg>
        )
      case 'quote':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 7h6v6H7z" opacity="0" />
            <path d="M7 7h6v6H7z" opacity="0" />
            <path d="M7 7h6v6H7z" opacity="0" />
            <path d="M9 7a4 4 0 0 0-4 4v3h5v-3H7a2 2 0 0 1 2-2V7z" />
            <path d="M19 7a4 4 0 0 0-4 4v3h5v-3h-3a2 2 0 0 1 2-2V7z" />
          </svg>
        )
      case 'code':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="7 8 3 12 7 16" />
            <polyline points="17 8 21 12 17 16" />
            <line x1="10" y1="19" x2="14" y2="5" />
          </svg>
        )
      case 'link':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.5 13.5L13.5 10.5" />
            <path d="M7 17a4 4 0 0 1 0-5.66l2-2A4 4 0 0 1 15 12" />
            <path d="M17 7a4 4 0 0 1 0 5.66l-2 2A4 4 0 0 1 9 12" />
          </svg>
        )
      case 'clear':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        )
      case 'fullscreen':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )
      case 'alignLeft':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="10" x2="14" y2="10" />
            <line x1="4" y1="14" x2="18" y2="14" />
            <line x1="4" y1="18" x2="12" y2="18" />
          </svg>
        )
      case 'alignCenter':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="6" x2="18" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="4" y1="14" x2="20" y2="14" />
            <line x1="9" y1="18" x2="15" y2="18" />
          </svg>
        )
      case 'alignRight':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="10" y1="10" x2="20" y2="10" />
            <line x1="6" y1="14" x2="20" y2="14" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
        )
      case 'alignJustify':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="10" x2="20" y2="10" />
            <line x1="4" y1="14" x2="20" y2="14" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        )
      case 'undo':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20a8 8 0 0 0-8-8H4" />
          </svg>
        )
      case 'redo':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 4 20 9 15 14" />
            <path d="M4 20a8 8 0 0 1 8-8h8" />
          </svg>
        )
      default:
        return null
    }
  }

  const autoResize = () => {
    if (!editorRef.current) return
    // Temporarily reset height to measure content
    editorRef.current.style.height = 'auto'
    const scrollH = editorRef.current.scrollHeight
    const target = typeof maxHeight === 'number' ? Math.min(scrollH, maxHeight) : scrollH
    editorRef.current.style.height = `${target}px`
    setOverflowY(target < scrollH ? 'auto' : 'hidden')
  }

  useEffect(() => {
    if (autoGrow && !isFullscreen) {
      autoResize()
    } else if (editorRef.current && isFullscreen) {
      // Reset height when entering fullscreen to let fixed sizing take over
      editorRef.current.style.height = ''
      setOverflowY('auto')
    }
  }, [value, autoGrow, maxHeight, isFullscreen])

  // Ensure editor DOM is always seeded with current value when switching view modes
  useEffect(() => {
    if (editorRef.current && typeof value === 'string' && editorRef.current.innerHTML !== value) {
      try { editorRef.current.innerHTML = value } catch {}
    }
  }, [isFullscreen])

  // Dismiss color pickers when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (isTextColorOpen && textColorRef.current && !textColorRef.current.contains(target)) {
        setIsTextColorOpen(false)
      }
      if (isHighlightColorOpen && highlightColorRef.current && !highlightColorRef.current.contains(target)) {
        setIsHighlightColorOpen(false)
      }
      if (isHelpOpen && helpRef.current && !helpRef.current.contains(target)) {
        setIsHelpOpen(false)
      }
      if (isTableGridOpen && tableGridRef.current && !tableGridRef.current.contains(target)) {
        setIsTableGridOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isTextColorOpen, isHighlightColorOpen])

  // Track selection inside editor to compute table context
  useEffect(() => {
    function updateTableCtx() {
      if (!editorRef.current) { setTableContext({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 }); return }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) { setTableContext({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 }); return }
      const anchor = sel.anchorNode as HTMLElement | null
      if (!anchor) { setTableContext({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 }); return }
      const host = anchor.nodeType === 3 ? (anchor.parentElement as HTMLElement | null) : (anchor as HTMLElement | null)
      if (!host || !editorRef.current.contains(host)) { setTableContext({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 }); return }
      const cell = host.closest('td,th') as HTMLTableCellElement | null
      const table = cell ? (cell.closest('table') as HTMLTableElement | null) : null
      if (!cell || !table) { setTableContext({ table: null, rowIndex: -1, colIndex: -1, colsCount: 0, rowsCount: 0 }); return }
      const row = cell.parentElement as HTMLTableRowElement
      const colIndex = Array.prototype.indexOf.call(row.children, cell)
      const rowIndex = Array.prototype.indexOf.call((row.parentElement as HTMLElement).children, row)
      const rowsCount = table.tBodies[0]?.rows.length || table.rows.length
      const colsCount = row.cells.length
      setTableContext({ table, rowIndex, colIndex, colsCount, rowsCount })
    }
    document.addEventListener('selectionchange', updateTableCtx)
    return () => document.removeEventListener('selectionchange', updateTableCtx)
  }, [])

  const pushEditorChange = () => {
    if (!editorRef.current) return
    const newContent = editorRef.current.innerHTML
    isUpdatingFromProps.current = true
    onChange(newContent)
    setLastGoodContent(newContent)
    setTimeout(() => { isUpdatingFromProps.current = false }, 0)
  }

  const insertTable = (rows: number, cols: number) => {
    if (!editorRef.current || readOnly) return
    editorRef.current.focus()
    const table = document.createElement('table')
    table.className = 'rte-table'
    const tbody = document.createElement('tbody')
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr')
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td')
        td.innerHTML = '&nbsp;'
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    const range = window.getSelection()?.getRangeAt(0)
    if (range) {
      range.collapse(false)
      range.insertNode(table)
    } else {
      editorRef.current.appendChild(table)
    }
    setIsTableGridOpen(false)
    pushEditorChange()
  }

  const addColumnRight = () => {
    const ctx = tableContext
    if (!ctx.table || ctx.colIndex < 0) return
    const rows = Array.from(ctx.table.rows)
    rows.forEach((row) => {
      const cell = row.cells[Math.min(ctx.colIndex, row.cells.length - 1)]
      const newCell = cell.cloneNode(true) as HTMLTableCellElement
      newCell.innerHTML = '&nbsp;'
      cell.after(newCell)
    })
    pushEditorChange()
  }

  const addRowBelow = () => {
    const ctx = tableContext
    if (!ctx.table || ctx.rowIndex < 0) return
    const body = ctx.table.tBodies[0] || ctx.table
    const refRow = body.rows[ctx.rowIndex]
    if (!refRow) return
    const newRow = refRow.cloneNode(true) as HTMLTableRowElement
    Array.from(newRow.cells).forEach((c) => (c.innerHTML = '&nbsp;'))
    refRow.after(newRow)
    pushEditorChange()
  }

  const deleteColumn = () => {
    const ctx = tableContext
    if (!ctx.table || ctx.colIndex < 0) return
    const rows = Array.from(ctx.table.rows)
    const firstRow = rows[0]
    if (firstRow && firstRow.cells.length <= 1) {
      ctx.table.remove()
    } else {
      rows.forEach((row) => {
        if (row.cells[ctx.colIndex]) row.deleteCell(ctx.colIndex)
      })
    }
    pushEditorChange()
  }

  const deleteRow = () => {
    const ctx = tableContext
    if (!ctx.table || ctx.rowIndex < 0) return
    const body = ctx.table.tBodies[0] || ctx.table
    if (body.rows.length <= 1) {
      ctx.table.remove()
    } else {
      const row = body.rows[ctx.rowIndex]
      if (row) row.remove()
    }
    pushEditorChange()
  }

  // When autoGrow is disabled (fixed height layout), ensure scrolling is enabled
  useEffect(() => {
    if (!autoGrow && !isFullscreen) {
      setOverflowY('auto')
    }
  }, [autoGrow, isFullscreen])

  const Toolbar = (
    <div
      className={`toolbar ${floatingToolbar ? 'sticky top-2 z-50 m-2 rounded-2xl border border-white/10 bg-[rgb(var(--bg))]/85 backdrop-blur-md shadow-2xl' : 'relative rounded-2xl border-b border-white/10 bg-white/5 shadow-xl'} ${isToolbarCollapsed ? 'p-2' : 'p-5'} flex flex-col gap-3 relative`}
    >
      {!isToolbarCollapsed && (
        <button
          type="button"
          onClick={() => setIsToolbarCollapsed(true)}
          className="absolute right-2 top-2 z-50 w-9 h-9 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Collapse toolbar"
          title="Collapse toolbar"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 12h8" />
          </svg>
        </button>
      )}
      {isToolbarCollapsed ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsToolbarCollapsed(false)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Expand toolbar"
            title="Expand toolbar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </button>
        </div>
      ) : (
      <div className="relative z-10">
      {/* Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Style */}
        <ToolbarGroup label="Style">
          <div className="relative">
            <select
              aria-label="Text style"
              className="brand-select appearance-none pr-8"
              onChange={(e) => {
                const value = (e.target as HTMLSelectElement).value
                if (value === 'P') applyBlock('p')
                else if (value === 'H1') applyBlock('h1')
                else if (value === 'H2') applyBlock('h2')
                else if (value === 'PRE') applyBlock('pre')
                else if (value === 'BLOCKQUOTE') applyBlock('blockquote')
              }}
              defaultValue="STYLE_DEFAULT"
              disabled={readOnly}
            >
              <option value="STYLE_DEFAULT">Style</option>
              <option value="P">Text</option>
              <option value="H1">Heading</option>
              <option value="H2">Subheading</option>
              <option value="PRE">Code</option>
              <option value="BLOCKQUOTE">Quote</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Text */}
        <ToolbarGroup label="Text">
          {formatButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`icon-btn icon-btn-sm ${
                isButtonActive(button.command)
                  ? 'bg-primary-300/20 text-primary-900 ring-1 ring-primary-400/40 border-0'
                  : 'icon-btn-ghost'
              }`}
              title={button.label}
              disabled={readOnly}
            >
              {getIcon(button.id)}
            </button>
          ))}
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Lists */}
        <ToolbarGroup label="Lists">
          {listButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => executeCommand(button.command)}
              className={`icon-btn icon-btn-sm ${
                isButtonActive(button.command)
                  ? 'bg-primary-300/20 text-primary-900 ring-1 ring-primary-400/40 border-0'
                  : 'icon-btn-ghost'
              }`}
              title={button.label}
              disabled={readOnly}
            >
              {getIcon(button.id)}
            </button>
          ))}
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Font */}
        <ToolbarGroup label="Font">
          <div className="relative">
            <select
              aria-label="Font family"
              className="brand-select appearance-none pr-8"
              onChange={(e) => executeCommand('fontName', e.target.value)}
              disabled={readOnly}
              defaultValue="Default"
            >
              <option value="Default">Font</option>
              <option value="Inter, system-ui, Arial">Sans</option>
              <option value="Georgia, 'Times New Roman', serif">Serif</option>
              <option value="'Fira Code', 'Courier New', monospace">Mono</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="relative">
            <select
              aria-label="Font size"
              className="brand-select appearance-none pr-8"
              onChange={(e) => executeCommand('fontSize', (e.target as HTMLSelectElement).value)}
              disabled={readOnly}
              defaultValue="SIZE_DEFAULT"
            >
              <option value="SIZE_DEFAULT">Size</option>
              <option value="2">Small</option>
              <option value="3">Normal</option>
              <option value="4">Large</option>
              <option value="5">Heading</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Align */}
        <ToolbarGroup label="Align">
          <button type="button" onClick={() => executeCommand('justifyLeft')} className="icon-btn icon-btn-sm icon-btn-ghost" title="Align left" disabled={readOnly}>{getIcon('alignLeft')}</button>
          <button type="button" onClick={() => executeCommand('justifyCenter')} className="icon-btn icon-btn-sm icon-btn-ghost" title="Align center" disabled={readOnly}>{getIcon('alignCenter')}</button>
          <button type="button" onClick={() => executeCommand('justifyRight')} className="icon-btn icon-btn-sm icon-btn-ghost" title="Align right" disabled={readOnly}>{getIcon('alignRight')}</button>
          <button type="button" onClick={() => executeCommand('justifyFull')} className="icon-btn icon-btn-sm icon-btn-ghost" title="Justify" disabled={readOnly}>{getIcon('alignJustify')}</button>
        </ToolbarGroup>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Colors */}
        <ToolbarGroup label="Colors">
          {/* Text color */}
          <div className="relative" ref={textColorRef}>
            <button type="button" onClick={() => !readOnly && setIsTextColorOpen((v) => !v)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10" aria-haspopup="dialog" aria-expanded={isTextColorOpen} aria-label="Text color" disabled={readOnly}>
              <span className="block w-3 h-3 rounded" style={{ background: '#a7dadb' }} />
            </button>
            {isTextColorOpen && !readOnly && (
              <div className="absolute left-0 top-10 z-50 w-44 rounded-lg border border-white/10 bg-[rgb(var(--bg))]/95 shadow-xl p-2 backdrop-blur-lg">
                <div className="grid grid-cols-8 gap-1">
                  {['#ffffff','#e5e7eb','#fca5a5','#fdba74','#fcd34d','#86efac','#93c5fd','#a7dadb','#f472b6','#c4b5fd'].map((c) => (
                    <button key={c} type="button" className="w-4 h-4 rounded" style={{ background: c }} onClick={() => { executeCommand('foreColor', c); setIsTextColorOpen(false) }} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" className="w-6 h-6 bg-transparent border border-white/10 rounded" onChange={(e) => { executeCommand('foreColor', e.target.value); setIsTextColorOpen(false) }} />
                  <span className="text-[10px] text-white/60">Custom</span>
                </div>
              </div>
            )}
          </div>

          {/* Highlight color */}
          <div className="relative" ref={highlightColorRef}>
            <button type="button" onClick={() => !readOnly && setIsHighlightColorOpen((v) => !v)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10" aria-haspopup="dialog" aria-expanded={isHighlightColorOpen} aria-label="Highlight color" disabled={readOnly}>
              <span className="block w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
            </button>
            {isHighlightColorOpen && !readOnly && (
              <div className="absolute left-0 top-10 z-50 w-44 rounded-lg border border-white/10 bg-[rgb(var(--bg))]/95 shadow-xl p-2 backdrop-blur-lg">
                <div className="grid grid-cols-8 gap-1">
                  {['#00000000','#fde68a','#fda4af','#fca5a5','#c7d2fe','#a7f3d0','#a78bfa','#fbbf24','#60a5fa','#22d3ee'].map((c) => (
                    <button key={c} type="button" className="w-4 h-4 rounded border border-white/10" style={{ background: c }} onClick={() => { executeCommand('hiliteColor', c); setIsHighlightColorOpen(false) }} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" className="w-6 h-6 bg-transparent border border-white/10 rounded" onChange={(e) => { executeCommand('hiliteColor', e.target.value); setIsHighlightColorOpen(false) }} />
                  <span className="text-[10px] text-white/60">Custom</span>
                </div>
              </div>
            )}
          </div>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Table */}
        <ToolbarGroup label="Table">
          <div className="relative" ref={tableGridRef}>
            <button type="button" onClick={() => !readOnly && setIsTableGridOpen((v) => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Insert table (choose size)" aria-haspopup="dialog" aria-expanded={isTableGridOpen} disabled={readOnly}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
            {isTableGridOpen && !readOnly && (
              <div className="absolute left-0 top-10 z-50 w-56 rounded-lg border border-white/10 bg-[rgb(var(--bg))]/95 shadow-xl p-3 backdrop-blur-lg">
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 8 }).map((_, r) => (
                    Array.from({ length: 10 }).map((_, c) => (
                      <button key={`${r}-${c}`} type="button" className={`h-4 w-4 rounded ${r < gridRowsHover && c < gridColsHover ? 'bg-primary-300/70' : 'bg-white/20 hover:bg-white/30'}`} onMouseEnter={() => { setGridRowsHover(r + 1); setGridColsHover(c + 1) }} onClick={() => insertTable(r + 1, c + 1)} aria-label={`Insert ${r + 1} by ${c + 1} table`} />
                    ))
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-white/60">{gridRowsHover || 0} × {gridColsHover || 0}</div>
                <div className="mt-2 text-[10px] text-white/40">Tip: Click inside any cell to add/delete rows or columns.</div>
              </div>
            )}
          </div>
          <button type="button" onClick={addColumnRight} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tableContext.table ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`} title="Add column to the right of current cell" disabled={readOnly || !tableContext.table}> 
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="16" y1="12" x2="20" y2="12" /></svg>
          </button>
          <button type="button" onClick={addRowBelow} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tableContext.table ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`} title="Add row below current row" disabled={readOnly || !tableContext.table}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20" /><line x1="4" y1="16" x2="20" y2="16" /></svg>
          </button>
          <button type="button" onClick={deleteColumn} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tableContext.table ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`} title="Delete current column" disabled={readOnly || !tableContext.table}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          </button>
          <button type="button" onClick={deleteRow} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tableContext.table ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-white/30 cursor-not-allowed'}`} title="Delete current row" disabled={readOnly || !tableContext.table}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="12" x2="20" y2="12" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          </button>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Blocks */}
        <ToolbarGroup label="Blocks">
          <button type="button" onClick={toggleBlockquote} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Blockquote" disabled={readOnly}>{getIcon('quote')}</button>
          <button type="button" onClick={toggleCodeBlock} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Code block" disabled={readOnly}>{getIcon('code')}</button>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* Insert */}
        <ToolbarGroup label="Insert">
          <button type="button" onClick={addLink} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Add Link" disabled={readOnly}>{getIcon('link')}</button>
        </ToolbarGroup>

        <div className="w-px h-6 bg-white/15" />

        {/* History */}
        <ToolbarGroup label="History">
          <button type="button" onClick={() => executeCommand('undo')} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Undo (Ctrl/Cmd+Z)" disabled={readOnly}>{getIcon('undo')}</button>
          <button type="button" onClick={() => executeCommand('redo')} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Redo (Ctrl/Cmd+Y)" disabled={readOnly}>{getIcon('redo')}</button>
          <button type="button" onClick={removeFormat} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Clear formatting" disabled={readOnly}>{getIcon('clear')}</button>
          <button type="button" onClick={() => setIsToolbarCollapsed(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Collapse toolbar" aria-label="Collapse toolbar">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12h8" /></svg>
          </button>
          {showFullscreen && (<button type="button" onClick={() => setIsFullscreen(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title={isFullscreen ? 'Exit full screen' : 'Full screen'}>{getIcon('fullscreen')}</button>)}
        </ToolbarGroup>
      </div>
      </div>
      )}
    </div>
  )

  useEffect(() => {
    if (isFullscreen) {
      try { document.body.style.overflow = 'hidden' } catch {}
    } else {
      try { document.body.style.overflow = '' } catch {}
    }
    return () => { try { document.body.style.overflow = '' } catch {} }
  }, [isFullscreen])

  if (isFullscreen) {
    return (
      <div
        className={`fixed inset-0 z-[80] bg-[rgb(var(--bg))] ${compactDosStyle ? 'dos-compact' : ''} flex flex-col overscroll-contain isolate`}
        style={{ height: '100dvh', minHeight: '100vh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Toolbar as sticky header in flow for consistent sizing */}
        <div className="shrink-0 border-b border-white/10 bg-[rgb(var(--bg))]">
          {Toolbar}
        </div>
        {/* Editor area fills remaining space and is centered for better readability */}
        <div className="flex-1 min-h-0 px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-6xl mx-auto h-full">
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onInput={handleInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              onMouseDown={() => { if (!readOnly) { try { editorRef.current?.focus() } catch {} } }}
              className={`w-full h-full read-surface p-4 sm:p-6 text-sm text-white/90 outline-none resize-none overflow-y-auto brand-scroll relative z-10 pointer-events-auto ${compactDosStyle ? 'font-mono tracking-tight leading-6' : ''}`}
              style={{ lineHeight: '1.55', WebkitUserSelect: 'text', userSelect: 'text' }}
              data-placeholder={placeholder}
              tabIndex={0}
            />
          </div>
        </div>
        {/* Custom styles injected below */}
        <style>{`
          [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.4); pointer-events: none; }
          /* Strengthen reading canvas in fullscreen for maximum contrast */
          .fullscreen-editor .read-surface { 
            background: 
              linear-gradient(rgba(13,27,42,0.80), rgba(13,27,42,0.80)) padding-box,
              linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02)) border-box;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`border border-white/10 rounded-lg ${floatingToolbar ? '' : 'overflow-hidden'} bg-white/5 ${isFocused ? 'ring-2 ring-primary-400 border-primary-400' : ''} ${className} flex flex-col ${compactDosStyle ? 'dos-compact' : ''}`}>
      {/* Toolbar */}
      {Toolbar}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={`min-h-[120px] flex-1 p-3 text-sm text-white/90 outline-none resize-none brand-scroll ${overflowY === 'auto' ? 'overflow-y-auto' : ''} ${compactDosStyle ? 'font-mono tracking-tight leading-6' : ''}`}
        style={{ lineHeight: '1.5' }}
        data-placeholder={placeholder}
      />

      {/* Custom styles for the editor */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }
        
        /* Brand select styling */
        .brand-select {
          height: 2rem;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.5rem;
          padding: 0 1.75rem 0 0.5rem;
          outline: none;
          cursor: pointer;
        }
        .brand-select:hover { background: rgba(255,255,255,0.08); }
        .brand-select:focus { box-shadow: 0 0 0 2px rgba(167, 218, 219, 0.35); border-color: rgba(167, 218, 219, 0.35); }
        .brand-select option { background: rgb(16,18,24); color: #fff; }

        /* Table styling */
        .rte-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.5rem 0;
        }
        .rte-table td, .rte-table th {
          border: 1px solid rgba(255,255,255,0.15);
          padding: 0.375rem 0.5rem;
          vertical-align: top;
        }
        .rte-table tr:nth-child(odd) td { background: rgba(255,255,255,0.02); }
        .rte-table tr:hover td { background: rgba(255,255,255,0.04); }

        /* DOS compact mode tweaks */
        .dos-compact [contenteditable] {
          font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          line-height: 1.35;
          padding: 0.5rem 0.75rem;
        }
        .dos-compact .glass-card, .dos-compact .toolbar {
          padding: 0.25rem 0.375rem;
        }
        .dos-compact .w-8.h-8 { width: 1.75rem; height: 1.75rem; }
        .dos-compact [contenteditable] ul,
        .dos-compact [contenteditable] ol { padding-left: 1rem; margin: 0.25rem 0; }
        .dos-compact [contenteditable] li { margin: 0.125rem 0; }
        .dos-compact [contenteditable] p { margin: 0.25rem 0; }
        
        [contenteditable] h1,
        .prose h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0; }
        [contenteditable] h2,
        .prose h2 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0; }
        [contenteditable] h3,
        .prose h3 { font-size: 1.125rem; font-weight: 600; margin: 0.5rem 0; }
        
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
