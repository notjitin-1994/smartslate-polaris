import { useState, useRef, useEffect } from 'react'
import { callLLM } from '@/services/llmClient'
import { RichTextEditor } from '@/components/RichTextEditor'
import { markdownToHtml, htmlToMarkdown } from '@/lib/textUtils'

export interface EditRequest {
  id: string
  userRequest: string
  aiResponse: string
  previousContent: string
  newContent: string
  timestamp: Date
  status: 'pending' | 'completed' | 'error'
  errorMessage?: string
}

export interface AIReportEditorProps {
  reportContent: string
  greetingReport?: string
  orgReport?: string
  requirementReport?: string
  maxEdits?: number
  onContentChange: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
}

export function AIReportEditor({
  reportContent,
  greetingReport = '',
  orgReport = '',
  requirementReport = '',
  maxEdits = 3,
  onContentChange,
  className = ''
}: AIReportEditorProps) {
  const [currentContent, setCurrentContent] = useState<string>(markdownToHtml(reportContent))
  const [editHistory, setEditHistory] = useState<EditRequest[]>([])
  const [currentEditIndex, setCurrentEditIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const [editorHeight, setEditorHeight] = useState<number>(0)

  // Calculate remaining edits
  const editsUsed = editHistory.filter(e => e.status === 'completed').length
  const editsRemaining = maxEdits - editsUsed

  // Sync remaining edits for Lodestar popup
  useEffect(() => {
    try {
      localStorage.setItem('lodestar:editsRemaining', String(Math.max(0, editsRemaining)))
    } catch {}
  }, [editsRemaining])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [editHistory])

  // Compute dynamic height so editor fits viewport with healthy padding
  useEffect(() => {
    function recalc() {
      try {
        const el = editorContainerRef.current
        if (!el) return
        const paddingBottomPx = 32
        const minHeightPx = 420
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight
        const next = Math.max(minHeightPx, Math.floor(vh - rect.top - paddingBottomPx))
        setEditorHeight(next)
      } catch {}
    }
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, { passive: true } as any)
    const vv: any = (window as any).visualViewport
    if (vv?.addEventListener) vv.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc)
      if (vv?.removeEventListener) vv.removeEventListener('resize', recalc)
    }
  }, [])

  // Handle content changes from manual editing
  const handleManualEdit = (newContent: string) => {
    setCurrentContent(newContent)
    onContentChange(htmlToMarkdown(newContent))
  }

  // Process AI edit request
  const processAIEdit = async () => {
    if (!userInput.trim() || editsRemaining <= 0 || isProcessing) return

    setIsProcessing(true)
    setError(null)

    const newEdit: EditRequest = {
      id: `edit-${Date.now()}`,
      userRequest: userInput.trim(),
      aiResponse: '',
      previousContent: htmlToMarkdown(currentContent),
      newContent: '',
      timestamp: new Date(),
      status: 'pending'
    }

    // Add to history immediately to show in UI
    setEditHistory(prev => [...prev, newEdit])
    setUserInput('')

    try {
      // Prepare context for Claude
      const systemPrompt = `You are an expert report editor helping to refine and improve a needs analysis report. 
      You have access to the following context:
      
      1. ORIGINAL RESEARCH - Greeting/Context:
      ${greetingReport}
      
      2. ORIGINAL RESEARCH - Organization Analysis:
      ${orgReport}
      
      3. ORIGINAL RESEARCH - Requirements:
      ${requirementReport}
      
      4. CURRENT REPORT CONTENT (Markdown):
      ${htmlToMarkdown(currentContent)}
      
      The user has requested the following edit. Make the requested changes while:
      - Maintaining consistency with the research context
      - Preserving the overall structure and flow
      - Ensuring accuracy and professionalism
      - Being specific and actionable
      
      Return your response in this exact JSON format:
      {
        "explanation": "Brief explanation of the changes made",
        "editedContent": "The complete edited report content with your changes applied, in Markdown"
      }`

      const userPrompt = `Edit Request: ${userInput.trim()}
      
      Please make the requested changes to the report and return the complete edited version.`

      const response = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.3,
        maxTokens: 8000
      })

      // Parse response
      let parsedResponse: { explanation: string; editedContent: string }
      try {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Invalid response format')
        }
      } catch (parseError) {
        // Fallback: treat entire response as edited content
        parsedResponse = {
          explanation: 'Changes applied as requested.',
          editedContent: response.content
        }
      }

      // Update the edit with results
      const updatedEdit: EditRequest = {
        ...newEdit,
        aiResponse: parsedResponse.explanation,
        newContent: parsedResponse.editedContent,
        status: 'completed'
      }

      // Update history and content
      setEditHistory(prev => 
        prev.map(e => e.id === newEdit.id ? updatedEdit : e)
      )
      setCurrentContent(markdownToHtml(parsedResponse.editedContent))
      onContentChange(parsedResponse.editedContent)
      setCurrentEditIndex(editHistory.length)

    } catch (error: any) {
      console.error('AI edit failed:', error)
      
      // Update edit with error status
      const errorEdit: EditRequest = {
        ...newEdit,
        status: 'error',
        errorMessage: error.message || 'Failed to process edit request'
      }
      
      setEditHistory(prev => 
        prev.map(e => e.id === newEdit.id ? errorEdit : e)
      )
      setError('Failed to process your edit request. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Main editor */}
        <div className="flex-1 min-w-0">
          <div ref={editorContainerRef} style={{ height: editorHeight ? `${editorHeight}px` : undefined }} className="min-h-[420px]">
            <RichTextEditor
              value={currentContent}
              onChange={handleManualEdit}
              placeholder="Report content..."
              className="h-full brand-scroll"
              autoGrow={false}
            />
          </div>
        </div>

        {/* Solara Lodestar Panel */}
        {showAIAssistant && (
          <div className="w-96 flex flex-col glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Solara Lodestar</h3>
              <button
                type="button"
                onClick={() => setShowAIAssistant(false)}
                className="icon-btn icon-btn-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Chat history */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0">
              {editHistory.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <svg className="w-12 h-12 mx-auto mb-3 text-primary-300/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                  <p className="text-sm">Ask me to help edit your report</p>
                  <p className="text-xs mt-1">I can refine content, improve clarity, or make specific changes</p>
                </div>
              ) : (
                editHistory.map((edit, index) => (
                  <div key={edit.id} className="space-y-2">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="bg-primary-500/20 rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-sm text-white">{edit.userRequest}</p>
                        <p className="text-xs text-white/60 mt-1">
                          {new Date(edit.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex justify-start">
                      <div className="bg-white/10 rounded-lg px-3 py-2 max-w-[80%]">
                        {edit.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary-300 border-t-transparent rounded-full"/>
                            <span className="text-sm text-white/60">Processing...</span>
                          </div>
                        ) : edit.status === 'error' ? (
                          <p className="text-sm text-red-400">{edit.errorMessage}</p>
                        ) : (
                          <>
                            <p className="text-sm text-white">{edit.aiResponse}</p>
                            {index <= currentEditIndex && (
                              <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                Applied
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-white/10 pt-3">
              {error && (
                <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  {error}
                </div>
              )}
              
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      processAIEdit()
                    }
                  }}
                  placeholder={
                    editsRemaining > 0 
                      ? "Describe the changes you'd like to make..." 
                      : "You've reached the edit limit for this report"
                  }
                  disabled={editsRemaining <= 0 || isProcessing}
                  className="flex-1 input resize-none"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={processAIEdit}
                  disabled={!userInput.trim() || editsRemaining <= 0 || isProcessing}
                  className="btn btn-primary self-end"
                >
                  {isProcessing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  )}
                </button>
              </div>

              {editsRemaining > 0 && (
                <p className="text-xs text-white/40 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
