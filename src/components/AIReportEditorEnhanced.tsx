import { useState, useRef, useEffect } from 'react'
import { aiEditingService } from '@/services/aiEditingService'
import { RichTextEditor } from '@/components/RichTextEditor'
import { markdownToHtml, htmlToMarkdown } from '@/lib/textUtils'
import { convertNaJsonStringToMarkdown } from '@/polaris/needs-analysis/format'
import type { EditRequest } from './AIReportEditor'

export interface AIReportEditorEnhancedProps {
  summaryId?: string
  reportContent: string
  greetingReport?: string
  orgReport?: string
  requirementReport?: string
  maxEdits?: number
  onContentChange: (content: string) => void
  onSave?: (content: string) => Promise<void>
  className?: string
  readOnly?: boolean
}

export function AIReportEditorEnhanced({
  summaryId,
  reportContent,
  greetingReport = '',
  orgReport = '',
  requirementReport = '',
  maxEdits = 3,
  onContentChange,
  className = '',
  readOnly = false
}: AIReportEditorEnhancedProps) {
  const [currentContent, setCurrentContent] = useState<string>(markdownToHtml(convertNaJsonStringToMarkdown(reportContent) || reportContent))
  const [editHistory, setEditHistory] = useState<EditRequest[]>([])
  const [currentEditIndex, setCurrentEditIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editsRemaining, setEditsRemaining] = useState(maxEdits)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const [editorHeight, setEditorHeight] = useState<number>(0)

  // Load edit history and limits from database
  useEffect(() => {
    async function loadEditData() {
      if (!summaryId) return
      
      setIsLoadingHistory(true)
      try {
        // Load edit history
        const history = await aiEditingService.getEditHistory(summaryId)
        setEditHistory(history)
        
        // If there's history, set the current content to the last edit
        if (history.length > 0) {
          const lastCompletedEdit = [...history].reverse().find(e => e.status === 'completed')
          if (lastCompletedEdit) {
            setCurrentContent(markdownToHtml(lastCompletedEdit.newContent))
            onContentChange(lastCompletedEdit.newContent)
            setCurrentEditIndex(history.indexOf(lastCompletedEdit))
          }
        }
        
        // Load edit limits
        const limits = await aiEditingService.getEditLimits(summaryId)
        if (limits) {
          setEditsRemaining(limits.max_edits - limits.edits_used)
        }
      } catch (error) {
        console.error('Failed to load edit data:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    loadEditData()
  }, [summaryId])

  // Sync remaining edits for Lodestar popup
  useEffect(() => {
    try {
      localStorage.setItem('lodestar:editsRemaining', String(Math.max(0, editsRemaining)))
    } catch {}
  }, [editsRemaining])

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current && showAIAssistant) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [editHistory, showAIAssistant])

  // Handle content changes from manual editing
  const handleManualEdit = (newContent: string) => {
    if (readOnly) return
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
      previousContent: currentContent,
      newContent: '',
      timestamp: new Date(),
      status: 'pending'
    }

    // Add to history immediately to show in UI
    setEditHistory(prev => [...prev, newEdit])
    setUserInput('')

    try {
      // Process edit with AI service
      const result = await aiEditingService.processEdit(
        htmlToMarkdown(currentContent),
        userInput.trim(),
        {
          greetingReport,
          orgReport,
          requirementReport
        }
      )

      if (result.success && result.editedContent) {
        // Log for debugging
        console.log('Edit successful:', {
          originalLength: currentContent.length,
          editedLength: result.editedContent.length,
          hasExecutiveSummary: result.editedContent.includes('## Executive Summary'),
          hasRecommendedSolution: result.editedContent.includes('## Recommended Solution')
        })
        
        // Update the edit with results
        const updatedEdit: EditRequest = {
          ...newEdit,
          aiResponse: result.explanation || 'Changes applied successfully.',
          newContent: result.editedContent,
          status: 'completed'
        }

        // Update history
        setEditHistory(prev => 
          prev.map(e => e.id === newEdit.id ? updatedEdit : e)
        )
        
        // Update content
        setCurrentContent(markdownToHtml(result.editedContent))
        onContentChange(result.editedContent)
        setCurrentEditIndex(editHistory.length)
        setEditsRemaining(prev => Math.max(0, prev - 1))
        
        // Save to database if summaryId is provided
        if (summaryId) {
          await aiEditingService.saveEdit(summaryId, updatedEdit)
        }
      } else {
        // Log the error for debugging
        console.error('Edit failed:', result.error)
        throw new Error(result.error || 'Failed to process edit')
      }
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

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary-300 border-t-transparent rounded-full"/>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar removed per design */}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Main editor */}
        <div className="flex-1 min-w-0">
          <div ref={editorContainerRef} style={{ height: editorHeight ? `${editorHeight}px` : undefined }} className="min-h-[420px]">
            <RichTextEditor
              value={currentContent}
              onChange={handleManualEdit}
              placeholder="Report content..."
              className="h-full brand-scroll"
              compactDosStyle
              autoGrow={false}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Solara Lodestar Panel */}
        {showAIAssistant && (
          <div className="w-96 flex flex-col glass-card">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                  <h3 className="font-semibold text-white">Solara Lodestar</h3>
                </div>
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
              <p className="text-xs text-white/60 mt-1">
                I can help refine and improve your report
              </p>
            </div>

            {/* Chat history */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {editHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <svg className="w-8 h-8 text-primary-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                    </svg>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">Ready to assist</h4>
                  <p className="text-xs text-white/60 max-w-[200px] mx-auto">
                    Describe any changes you'd like to make to your report
                  </p>
                  
                  {/* Quick action suggestions */}
                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-white/40">Try asking me to:</p>
                    <div className="space-y-1">
                      {[
                        'Make the executive summary more concise',
                        'Add more specific metrics',
                        'Improve the recommendations section',
                        'Make the language more formal'
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setUserInput(suggestion)}
                          className="block w-full text-left text-xs px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors"
                        >
                          "{suggestion}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                editHistory.map((edit, index) => (
                  <div key={edit.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="bg-primary-500/20 backdrop-blur rounded-lg px-3 py-2">
                          <p className="text-sm text-white">{edit.userRequest}</p>
                        </div>
                        <p className="text-xs text-white/40 mt-1 text-right">
                          {new Date(edit.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                          {edit.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-primary-300 border-t-transparent rounded-full"/>
                              <span className="text-sm text-white/60">Processing your request...</span>
                            </div>
                          ) : edit.status === 'error' ? (
                            <div className="space-y-1">
                              <p className="text-sm text-red-400 flex items-center gap-1">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 8v4M12 16h.01"/>
                                </svg>
                                Error
                              </p>
                              <p className="text-xs text-red-400/80">{edit.errorMessage}</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-white">{edit.aiResponse}</p>
                              {index <= currentEditIndex && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                  Applied to report
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-white/10 p-4">
              {error && (
                <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
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
                      ? "Describe the changes you'd like..." 
                      : "You've reached the edit limit"
                  }
                  disabled={editsRemaining <= 0 || isProcessing || readOnly}
                  className="flex-1 input resize-none text-sm"
                  rows={3}
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={processAIEdit}
                    disabled={!userInput.trim() || editsRemaining <= 0 || isProcessing || readOnly}
                    className="btn btn-primary btn-sm"
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
              </div>

              {editsRemaining > 0 && !readOnly && (
                <p className="text-xs text-white/40 mt-2">
                  Press Enter to send • Shift+Enter for new line
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
