import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { llmService, type ChatMessage } from '@/services'
import { getPolarisDataFromPage, type PolarisData } from '@/services/polarisDataService'

type Message = ChatMessage & { id: string }

function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.75l2.917 5.91 6.523.948-4.72 4.6 1.114 6.492L12 17.98 6.166 20.7l1.115-6.492-4.72-4.6 6.522-.948L12 2.75z" />
    </svg>
  )
}

export function SolaraLodestar() {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lodestar:open') === '1'
    } catch {}
    return false
  })
  const [input, setInput] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem('lodestar:messages')
      if (raw) return JSON.parse(raw)
    } catch {}
    return []
  })
  const [editsRemaining, setEditsRemaining] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('lodestar:editsRemaining')
      return raw ? Number(raw) : 0
    } catch {
      return 0
    }
  })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('lodestar:open', open ? '1' : '0')
    } catch {}
  }, [open])

  useEffect(() => {
    try {
      localStorage.setItem('lodestar:messages', JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    if (!open) return
    const el = endRef.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [open, messages.length])

  // Function to gather Polaris data from the current context
  const gatherPolarisData = useMemo((): PolarisData => {
    try {
      // Get basic data from localStorage
      const stage1Answers = JSON.parse(localStorage.getItem('polaris_stage1') || '{}')
      const stage2Answers = JSON.parse(localStorage.getItem('polaris_stage2') || '{}')
      const stage3Answers = JSON.parse(localStorage.getItem('polaris_stage3') || '{}')
      const experienceAnswer = JSON.parse(localStorage.getItem('polaris_experience') || '{}')
      
      // Try to get company name from various sources
      const companyName = stage1Answers.org_name || 
                         stage1Answers.company_name || 
                         stage2Answers.org_name || 
                         stage2Answers.org_industry || 
                         stage1Answers.requester_company || 
                         ''
      
      // Try to access Polaris data from the current page context
      // This is a more sophisticated approach to get the actual reports
      let polarisData = getPolarisDataFromPage()
      
      // If we have basic data but no reports, try to construct useful context
      if (Object.keys(stage1Answers).length > 0 || Object.keys(stage2Answers).length > 0 || Object.keys(stage3Answers).length > 0) {
        // Create a summary of available data
        const dataSummary = {
          stage1: Object.keys(stage1Answers).length > 0 ? 'Requester & Organization details available' : '',
          stage2: Object.keys(stage2Answers).length > 0 ? 'Project & Stakeholder details available' : '',
          stage3: Object.keys(stage3Answers).length > 0 ? 'Technical & Implementation details available' : '',
          experience: experienceAnswer.exp_level ? `Experience level: ${experienceAnswer.exp_level}` : ''
        }
        
        // Add this to the context
        polarisData = {
          ...polarisData,
          stage1Answers,
          stage2Answers,
          stage3Answers,
          companyName,
          dataSummary: JSON.stringify(dataSummary)
        }
      }
      
      return polarisData
    } catch (error) {
      console.warn('Could not gather Polaris data:', error)
      return {}
    }
  }, [])

  // Listen for editsRemaining changes across the app
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'lodestar:editsRemaining' && e.newValue != null) {
        const next = Number(e.newValue)
        if (!Number.isNaN(next)) setEditsRemaining(next)
      }
    }
    window.addEventListener('storage', onStorage)
    const interval = window.setInterval(() => {
      try {
        const raw = localStorage.getItem('lodestar:editsRemaining')
        const next = raw ? Number(raw) : 0
        if (!Number.isNaN(next) && next !== editsRemaining) setEditsRemaining(next)
      } catch {}
    }, 1500)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(interval)
    }
  }, [editsRemaining])

  // Listen for Polaris data changes
  useEffect(() => {
    function onPolarisDataChange() {
      // Force re-evaluation of Polaris data when localStorage changes
      const polarisData = gatherPolarisData
      if (polarisData.companyName) {
        // Update suggestions based on available data
        const hasReports = polarisData.greetingReport || polarisData.orgReport || polarisData.requirementReport
        if (hasReports) {
          // Data is available, we can provide more specific analysis
        }
      }
    }
    
    // Listen for storage events (when Polaris saves data)
    window.addEventListener('storage', onPolarisDataChange)
    
    // Also check periodically for new data
    const interval = setInterval(onPolarisDataChange, 3000)
    
    return () => {
      window.removeEventListener('storage', onPolarisDataChange)
      clearInterval(interval)
    }
  }, [gatherPolarisData])

  function newId() {
    return Math.random().toString(36).slice(2, 10)
  }

  const systemPrompt = useMemo(() => {
    const polarisData = gatherPolarisData
    const hasData = polarisData.companyName || polarisData.stage1Answers || polarisData.stage2Answers || polarisData.stage3Answers
    
    let basePrompt = 'You are Solara Lodestar, a concise, warm, highly capable AI L&D consultant. ' +
      'Adopt a Claude-like tone: thoughtful, structured, transparent about uncertainty, and collaborative. ' +
      'Prefer short paragraphs, clear lists, and concrete next steps. Use plain language.'
    
    if (hasData) {
      basePrompt += '\n\nIMPORTANT: You have access to Polaris needs analysis data. When users ask for analysis, reviews, or recommendations, ALWAYS use this data instead of asking them to provide information. Analyze what you have and provide specific, actionable insights.'
      
      if (polarisData.companyName) basePrompt += `\n- Organization: ${polarisData.companyName}`
      if (polarisData.dataSummary) basePrompt += `\n- Available Data: ${polarisData.dataSummary}`
      if (polarisData.greetingReport) basePrompt += '\n- Greeting/Research Report'
      if (polarisData.orgReport) basePrompt += '\n- Organization Analysis Report'
      if (polarisData.requirementReport) basePrompt += '\n- Requirements Analysis Report'
      if (polarisData.stage1Answers && Object.keys(polarisData.stage1Answers).length > 0) basePrompt += '\n- Stage 1: Requester & Organization Details'
      if (polarisData.stage2Answers && Object.keys(polarisData.stage2Answers).length > 0) basePrompt += '\n- Stage 2: Project & Stakeholder Details'
      if (polarisData.stage3Answers && Object.keys(polarisData.stage3Answers).length > 0) basePrompt += '\n- Stage 3: Technical & Implementation Details'
      
      basePrompt += '\n\nCRITICAL INSTRUCTION: When users ask for analysis or recommendations, DO NOT ask them to provide information you already have. Instead, analyze the available data and provide specific insights. If you need more information, ask specific follow-up questions about areas not covered in the data.'
    }
    
    return basePrompt
  }, [gatherPolarisData])

  async function sendPrompt(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setBusy(true)

    const nextMessages: Message[] = [
      ...messages,
      { id: newId(), role: 'user', content: trimmed },
    ]
    setMessages(nextMessages)
    setInput('')

    try {
      const polarisData = gatherPolarisData
      const hasData = polarisData.companyName || polarisData.stage1Answers || polarisData.stage2Answers || polarisData.stage3Answers
      
      let contextMessage = ''
      if (hasData) {
        contextMessage = '\n\nCURRENT POLARIS DATA:\n'
        if (polarisData.companyName) contextMessage += `Organization: ${polarisData.companyName}\n`
        if (polarisData.dataSummary) contextMessage += `Available Data: ${polarisData.dataSummary}\n`
        if (polarisData.greetingReport) contextMessage += `\nGreeting Report:\n${polarisData.greetingReport}\n`
        if (polarisData.orgReport) contextMessage += `\nOrganization Report:\n${polarisData.orgReport}\n`
        if (polarisData.requirementReport) contextMessage += `\nRequirements Report:\n${polarisData.requirementReport}\n`
        if (Object.keys(polarisData.stage1Answers || {}).length > 0) {
          contextMessage += `\nStage 1 Answers (Requester & Organization):\n${JSON.stringify(polarisData.stage1Answers, null, 2)}\n`
        }
        if (Object.keys(polarisData.stage2Answers || {}).length > 0) {
          contextMessage += `\nStage 2 Answers (Project & Stakeholders):\n${JSON.stringify(polarisData.stage2Answers, null, 2)}\n`
        }
        if (Object.keys(polarisData.stage3Answers || {}).length > 0) {
          contextMessage += `\nStage 3 Answers (Technical & Implementation):\n${JSON.stringify(polarisData.stage3Answers, null, 2)}\n`
        }
      }
      
      const finalPayload: ChatMessage[] = [
        { role: 'system', content: systemPrompt + contextMessage },
        ...nextMessages.map(({ role, content }) => ({ role, content })),
      ]

      const { content } = await llmService.callLLM(finalPayload)
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: content || '…' }])
    } catch (err: any) {
      const fallback = err?.message ? String(err.message) : 'Something went wrong. Please try again.'
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'assistant', content: `I hit an error: ${fallback}` },
      ])
    } finally {
      setBusy(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendPrompt(input)
  }

  function handleSuggestion(s: string) {
    if (busy) return
    setInput(s)
    void sendPrompt(s)
  }

  const suggestions = [
    'Analyze my organization & project context',
    'Review my requirements & learner profiles',
    'Provide personalized L&D recommendations',
  ]

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open])

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const overlay = (
    <div className="fixed right-0 bottom-0 z-[9999] pointer-events-none">
      <div className="relative pointer-events-auto p-6">
        {/* Chat Window */}
        {open && (
          <div 
            ref={containerRef} 
            className="absolute bottom-20 right-6 w-[min(calc(100vw-96px),420px)] h-[min(calc(100vh-180px),600px)] mb-2"
            role="dialog"
            aria-label="Solara Lodestar Chat"
            aria-modal="true"
          >
            <div className="relative h-full flex flex-col rounded-2xl border border-white/10 bg-[rgb(var(--bg))]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in-up animate-scale-in" style={{ transformOrigin: 'bottom right' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-secondary-400/10 to-secondary-500/5">
                <div className="flex items-center gap-2 text-white/90">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20">
                    <StarIcon className="w-3.5 h-3.5 text-primary-500 neon-glow" />
                  </span>
                  <div className="text-sm font-semibold">Solara Lodestar</div>
                  {editsRemaining > 0 && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/70 bg-white/5">
                      {editsRemaining} edits left
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    className="w-7 h-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200" 
                    aria-label="Clear conversation" 
                    title="Clear conversation" 
                    onClick={() => {
                      if (window.confirm('Clear all messages?')) setMessages([])
                    }}
                  >
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    className="w-7 h-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200" 
                    aria-label="Close chat" 
                    title="Close chat (Esc)" 
                    onClick={() => setOpen(false)}
                  >
                    <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                {messages.length === 0 && (
                  <div className="mb-3 text-xs text-white/60">
                    I'm your AI L&D consultant with access to your Polaris project data. I can analyze your organization context, review requirements, assess learner profiles, evaluate technology capabilities, and provide personalized next steps based on your specific project details.
                    {gatherPolarisData.companyName && (
                      <div className="mt-2 p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                        <span className="text-primary-400">📊 Active Context:</span> {gatherPolarisData.companyName}
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const data = gatherPolarisData
                        console.log('Available Polaris Data:', data)
                        alert(`Available Data:\n${JSON.stringify(data, null, 2)}`)
                      }}
                      className="mt-2 text-xs text-primary-400 hover:text-primary-300 underline"
                    >
                      🔍 Debug: Show Available Data
                    </button>
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="mb-3 grid grid-cols-1 gap-2">
                    {suggestions.map((s, idx) => (
                      <button 
                        key={s} 
                        type="button" 
                        className="group flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/85 hover:text-white hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-200 transform hover:translate-x-1" 
                        onClick={() => handleSuggestion(s)}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                        <span className="text-xs">{s}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto pr-1 custom-scroll">
                  {messages.map((m) => (
                    <div key={m.id} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words max-w-[85%] ${m.role === 'user' ? 'bg-secondary-400/20 border border-secondary-400/30 text-white/95' : 'bg-white/5 border border-white/10 text-white/90'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="mb-2 flex justify-start">
                      <div className="rounded-2xl px-3 py-2 text-sm bg-white/5 border border-white/10 text-white/70">
                        <span className="inline-block w-2 h-2 rounded-full bg-white/50 animate-pulse mr-1" />
                        Thinking…
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
                <form onSubmit={onSubmit} className="mt-4 pt-2 border-t border-white/10">
                  <div className="flex items-end gap-2">
                    <textarea 
                      rows={2} 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          void sendPrompt(input)
                        }
                      }}
                      placeholder={busy ? 'Working…' : 'Message Solara (Enter to send)'} 
                      disabled={busy} 
                      className="flex-1 resize-none rounded-2xl border border-primary-500/60 bg-[rgb(var(--bg))]/70 backdrop-blur-sm text-white/90 placeholder-white/50 px-3 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/80 transition-all duration-200" 
                    />
                    <button 
                      type="submit" 
                      disabled={busy || !input.trim()} 
                      className="shrink-0 grid place-items-center h-10 w-10 rounded-full bg-secondary-500 hover:bg-secondary-400 text-white shadow-lg shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95" 
                      aria-label="Send message" 
                      title="Send (Enter)"
                    >
                      {busy ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeOpacity="0.75" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 2L11 13" />
                          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Floating Action Button */}
        <button
          type="button"
          aria-label={open ? 'Close Solara Lodestar' : 'Open Solara Lodestar'}
          title={open ? 'Close chat' : 'Open Solara Lodestar AI Assistant'}
          onClick={() => setOpen((v) => !v)}
          className={`
            relative group inline-flex items-center gap-2 
            ${open 
              ? 'w-14 h-14 rounded-full justify-center bg-secondary-400/20 border-2 border-secondary-400/30 hover:bg-secondary-400/25' 
              : 'px-4 py-3 rounded-full bg-gradient-to-r from-secondary-400/90 to-secondary-500/90 border border-secondary-400/30'
            } 
            text-white fab-shadow 
            transform transition-all duration-300 ease-out 
            hover:scale-105 active:scale-95 
            focus:outline-none focus:ring-4 focus:ring-secondary-400/30
            ${!open && 'pressable'}
          `}
          style={{ transformOrigin: 'center' }}
        >
          {open ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          ) : (
            <>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-500/30">
                <StarIcon className="w-4 h-4 text-primary-500 neon-glow" />
              </span>
              <span className="text-sm font-semibold pr-1">Solara Lodestar</span>
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return overlay
  return createPortal(overlay, document.body)
}

export default SolaraLodestar



