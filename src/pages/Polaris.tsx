import { useEffect, useState } from 'react'
import { callLLM, type ChatMessage } from '@/services/llmClient'

type QuestionType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'radio' | 'chips' | 'boolean' | 'date'

type Question = {
  id: string
  label: string
  type: QuestionType
  placeholder?: string
  description?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

type QuestionnairePayload = {
  stage: 1 | 2 | 3
  questions: Question[]
}

const SYSTEM_PROMPT = `You are Smartslate's Product Discovery Copilot.
You will produce JSON ONLY (no markdown) describing a questionnaire tailored to a prospect.
JSON schema:
{
  "stage": 1 | 2 | 3,
  "questions": [
    {"id": string, "label": string, "type": "text"|"textarea"|"number"|"select"|"multiselect"|"radio"|"chips"|"boolean"|"date", "placeholder"?: string, "description"?: string, "required"?: boolean, "options"?: [{"value": string, "label": string}]} 
  ]
}
Rules:
- Keep IDs stable and URL-safe (kebab-case).
- Choose answer types appropriately (e.g., select/multiselect when you can suggest options, boolean for yes/no).
- Stages:
  1. First-pass scoping across org profile, goals, timeline, constraints.
  2. Deep-dive based on answers from Stage 1.
  3. Final clarification for solution fit and rollout details. 
- Use Smartslate context: Products at https://www.smartslate.io/products include Ignite Series (pre-built courses > talent pipeline), Strategic Skills Architecture (bespoke learning solutions, IP-safe), and Solara (AI-powered platform: Polaris/Constellation/Nova/Orbit/Nebula/Spectrum).
- Ask only what is necessary. 6–12 questions per stage.
- Localize labels in plain English.
- Output valid JSON with no backticks.`

function userPromptForStage(stage: 1 | 2 | 3, prior: any) {
  const base = `Prospect inputs so far (JSON):\n${JSON.stringify(prior, null, 2)}\n`
  if (stage === 2) return `${base}Generate the Stage 2 questionnaire (deep-dive).`
  if (stage === 3) return `${base}Generate the Stage 3 questionnaire (final clarifications + rollout specifics).`
  return `${base}Generate the Stage 1 questionnaire (first-pass scoping).`
}

function extractJsonBlock(s: string): any {
  const text = (s || '').trim()

  function fixJsonCommonIssues(input: string) {
    let out = input
    // normalize smart quotes
    out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    // strip code fences
    out = out.replace(/```json\s*([\s\S]*?)```/gi, '$1').replace(/```\s*([\s\S]*?)```/g, '$1')
    // remove trailing commas before } or ]
    out = out.replace(/,(\s*[}\]])/g, '$1')
    return out
  }

  function tryParse(candidate: string) {
    try {
      return JSON.parse(candidate)
    } catch {
      try {
        const fixed = fixJsonCommonIssues(candidate)
        return JSON.parse(fixed)
      } catch {
        return undefined
      }
    }
  }

  // direct parse
  let parsed = tryParse(text)
  if (parsed !== undefined) {
    return Array.isArray(parsed) ? { questions: parsed } : parsed
  }

  // ```json ... ``` fenced block
  const fenceJson = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenceJson) {
    parsed = tryParse(fenceJson[1].trim())
    if (parsed !== undefined) return Array.isArray(parsed) ? { questions: parsed } : parsed
  }

  // generic ``` ... ``` fenced block
  const fence = text.match(/```\s*([\s\S]*?)```/)
  if (fence) {
    parsed = tryParse(fence[1].trim())
    if (parsed !== undefined) return Array.isArray(parsed) ? { questions: parsed } : parsed
  }

  function extractBalanced(startChar: '{' | '[', endChar: '}' | ']', source: string): string | undefined {
    const start = source.indexOf(startChar)
    if (start === -1) return undefined
    let depth = 0
    let inString = false
    let prev = ''
    for (let i = start; i < source.length; i++) {
      const ch = source[i]
      if (ch === '"' && prev !== '\\') inString = !inString
      if (!inString) {
        if (ch === startChar) depth++
        if (ch === endChar) depth--
        if (depth === 0) return source.slice(start, i + 1)
      }
      prev = ch
    }
    return undefined
  }

  // balanced object
  const balancedObj = extractBalanced('{', '}', text)
  if (balancedObj) {
    parsed = tryParse(balancedObj)
    if (parsed !== undefined) return Array.isArray(parsed) ? { questions: parsed } : parsed
  }

  // balanced array
  const balancedArr = extractBalanced('[', ']', text)
  if (balancedArr) {
    parsed = tryParse(balancedArr)
    if (parsed !== undefined) return Array.isArray(parsed) ? { questions: parsed } : parsed
  }

  const snippet = text.slice(0, 200)
  throw new Error(`Could not parse LLM JSON. Snippet: ${snippet}`)
}

export default function Polaris() {
  const [active, setActive] = useState<'stage1' | 'stage2' | 'stage3' | 'summary'>('stage1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage1Questions, setStage1] = useState<Question[]>([])
  const [stage2Questions, setStage2] = useState<Question[]>([])
  const [stage3Questions, setStage3] = useState<Question[]>([])
  const [answers1, setAnswers1] = useState<Record<string, any>>({})
  const [answers2, setAnswers2] = useState<Record<string, any>>({})
  const [answers3, setAnswers3] = useState<Record<string, any>>({})
  const [analysis, setAnalysis] = useState<string>('')

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        setLoading(true)
        const messages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPromptForStage(1, {}) },
        ]
        const res = await callLLM(messages)
        if (ignore) return
        const json = extractJsonBlock(res.content)
        setStage1((json?.questions as Question[]) || [])
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load Stage 1 questions.')
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  async function genStage2() {
    try {
      setLoading(true)
      setError(null)
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptForStage(2, { answers1 }) },
      ]
      const res = await callLLM(messages)
      const json: QuestionnairePayload = extractJsonBlock(res.content)
      setStage2(json.questions || [])
      setActive('stage2')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 2 questionnaire.')
    } finally {
      setLoading(false)
    }
  }

  async function genStage3() {
    try {
      setLoading(true)
      setError(null)
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptForStage(3, { answers1, answers2 }) },
      ]
      const res = await callLLM(messages)
      const json: QuestionnairePayload = extractJsonBlock(res.content)
      setStage3(json.questions || [])
      setActive('stage3')
    } catch (e: any) {
      setError(e?.message || 'Failed to create Stage 3 questionnaire.')
    } finally {
      setLoading(false)
    }
  }

  async function analyze() {
    try {
      setLoading(true)
      setError(null)
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a senior Solutions Architect at Smartslate. Analyze prospect inputs across three stages and produce a concise solution proposal mapping to Smartslate offerings with rationale and next steps. Output in markdown.' },
        { role: 'user', content: `Prospect inputs (JSON):\n${JSON.stringify({ answers1, answers2, answers3 }, null, 2)}` },
      ]
      const res = await callLLM(messages, { temperature: 0.1 })
      setAnalysis(res.content || '')
      setActive('summary')
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze answers.')
    } finally {
      setLoading(false)
    }
  }

  function Field({ q, value, onChange }: { q: Question; value: any; onChange: (v: any) => void }) {
    const label = (
      <div className="space-y-1 break-words">
        <div className="text-sm font-medium text-white/90">{q.label}{q.required ? ' *' : ''}</div>
        {q.description && <div className="text-xs text-white/60">{q.description}</div>}
      </div>
    )
    if (q.type === 'textarea') {
      return (
        <label className="block space-y-2">
          {label}
          <textarea className="input min-h-[120px]" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />
        </label>
      )
    }
    if (q.type === 'number') {
      return (
        <label className="block space-y-2">
          {label}
          <input type="number" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder={q.placeholder} />
        </label>
      )
    }
    if (q.type === 'boolean') {
      return (
        <label className="block space-y-2">
          {label}
          <select className="input" value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(e) => onChange(e.target.value === 'yes')}>
            <option value="">Select yes/no</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      )
    }
    if (q.type === 'select' || q.type === 'radio') {
      return (
        <label className="block space-y-2">
          {label}
          <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">{q.placeholder || 'Select an option'}</option>
            {(q.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )
    }
    if (q.type === 'multiselect' || q.type === 'chips') {
      return (
        <div className="space-y-2">
          {label}
          <div className="flex flex-wrap gap-2">
            {(q.options || []).map((o) => {
              const active = Array.isArray(value) && value.includes(o.value)
              return (
                <button key={o.value} type="button" onClick={() => {
                  const next = new Set(Array.isArray(value) ? value : [])
                  if (next.has(o.value)) next.delete(o.value); else next.add(o.value)
                  onChange(Array.from(next))
                }} className={`px-3 py-1.5 rounded-full border transition pressable ${active ? 'border-transparent bg-primary-400 text-slate-900' : 'border-white/15 text-white/85 hover:bg-white/10'}`}>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    if (q.type === 'date') {
      return (
        <label className="block space-y-2">
          {label}
          <input type="date" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </label>
      )
    }
    return (
      <label className="block space-y-2">
        {label}
        <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={q.placeholder} />
      </label>
    )
  }

  function markdownToHtml(md: string): string {
    let html = md
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    html = html.replace(/^\*\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    html = html.replace(/^\-\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\n/g, '<br />')
    return html.trim()
  }

  // Horizontal stepper to visualize active stage
  function Stepper() {
    const steps: Array<{ key: 'stage1' | 'stage2' | 'stage3' | 'summary'; label: string }> = [
      { key: 'stage1', label: 'Stage 1' },
      { key: 'stage2', label: 'Stage 2' },
      { key: 'stage3', label: 'Stage 3' },
      { key: 'summary', label: 'Summary' },
    ]
    const order: Array<'stage1' | 'stage2' | 'stage3' | 'summary'> = ['stage1', 'stage2', 'stage3', 'summary']
    const currentIndex = order.indexOf(active)

    return (
      <>
        {/* Mobile: simple progress bar with status text */}
        <div className="md:hidden flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(1, currentIndex / (steps.length - 1))) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/70 whitespace-nowrap">Stage {Math.min(currentIndex + 1, 3)} of 3</span>
        </div>

        {/* Desktop: clickable stepper with labels */}
        <ol className="hidden md:flex items-center gap-3 md:gap-4 flex-nowrap whitespace-nowrap w-max snap-x">
          {steps.map((s, idx) => {
            const isCompleted = idx < currentIndex
            const isActive = idx === currentIndex
            return (
              <li key={s.key} className="flex items-center gap-3 snap-start">
                <button
                  type="button"
                  onClick={() => setActive(s.key)}
                  className={`pressable flex items-center gap-2 rounded-full px-3 py-1.5 border ${isActive ? 'border-primary-400 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'} text-xs md:text-sm`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${isCompleted ? 'bg-primary-400 text-slate-900' : isActive ? 'bg-white/90 text-slate-900' : 'bg-white/10 text-white/80'}`}>{idx + 1}</span>
                  <span className={`font-medium ${isCompleted ? 'text-primary-400' : 'text-white/85'}`}>{s.label}</span>
                </button>
                {idx !== steps.length - 1 && (
                  <div className={`h-[2px] w-6 md:w-10 ${idx < currentIndex ? 'bg-primary-400/80' : 'bg-white/10'}`} />
                )}
              </li>
            )
          })}
        </ol>
      </>
    )
  }

  return (
    <div className="px-4 py-6 page-enter">
      <div className="mb-5">
        <div className="glass-card p-4 md:p-6 elevate">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="overflow-x-auto stepper-scroll">
              {<Stepper />}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost px-3 py-2 text-sm"
                onClick={() => { setAnswers1({}); setAnswers2({}); setAnswers3({}); setActive('stage1') }}
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border-l-4 border-red-400/80 bg-red-500/10 p-3 text-red-200 text-sm">{error}</div>
      )}

      {active === 'stage1' && (
        <section className="space-y-4">
          {stage1Questions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage1Questions.map((q) => (
                <div key={q.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <Field q={q} value={answers1[q.id]} onChange={(v) => setAnswers1({ ...answers1, [q.id]: v })} />
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 md:p-5">
                  <div className="h-5 w-1/3 rounded skeleton mb-3" />
                  <div className="h-10 w-full rounded skeleton" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">No questions yet.</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setAnswers1({})}>Reset</button>
            <button type="button" className="btn-primary text-sm" onClick={genStage2} disabled={loading}>{loading ? 'Generating…' : 'Next: Generate Stage 2'}</button>
          </div>
        </section>
      )}

      {active === 'stage2' && (
        <section className="space-y-4">
          {stage2Questions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage2Questions.map((q) => (
                <div key={q.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <Field q={q} value={answers2[q.id]} onChange={(v) => setAnswers2({ ...answers2, [q.id]: v })} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">No questions yet.</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setActive('stage1')}>Back</button>
            <button type="button" className="btn-primary text-sm" onClick={genStage3} disabled={loading}>{loading ? 'Generating…' : 'Next: Generate Stage 3'}</button>
          </div>
        </section>
      )}

      {active === 'stage3' && (
        <section className="space-y-4">
          {stage3Questions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage3Questions.map((q) => (
                <div key={q.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <Field q={q} value={answers3[q.id]} onChange={(v) => setAnswers3({ ...answers3, [q.id]: v })} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">No questions yet.</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setActive('stage2')}>Back</button>
            <button type="button" className="btn-primary text-sm" onClick={analyze} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze & Propose'}</button>
          </div>
        </section>
      )}

      {active === 'summary' && (
        <section className="space-y-4">
          {analysis ? (
            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(analysis) }} />
          ) : (
            <div className="text-sm text-white/60">Run the analysis to see a tailored proposal mapped to Ignite / Strategic Skills Architecture / Solara.</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setActive('stage1')}>Start Over</button>
            <button type="button" className="btn-primary text-sm" onClick={() => navigator.clipboard.writeText(analysis || '')}>Copy Summary</button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-white/60">Developer debug: raw JSON</summary>
            <pre className="text-xs bg-white/5 p-3 rounded-md overflow-auto border border-white/10 text-white/80">{JSON.stringify({ answers1, answers2, answers3, stage1Questions, stage2Questions, stage3Questions }, null, 2)}</pre>
          </details>
        </section>
      )}
    </div>
  )
}


