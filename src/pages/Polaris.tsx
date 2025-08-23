import { memo, useRef, useState } from 'react'
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

// Static first-contact intake questionnaire
const INTAKE_QUESTIONS: Question[] = [
  { id: 'contact_name', label: 'Your name', type: 'text', placeholder: 'Jane Doe', required: true },
  { id: 'contact_email', label: 'Work email', type: 'text', placeholder: 'jane@company.com', required: true },
  { id: 'company_name', label: 'Company / Organization', type: 'text', placeholder: 'Acme Inc.', required: true },
  { id: 'role_title', label: 'Your role / title', type: 'text', placeholder: 'L&D Director' },
  {
    id: 'company_size',
    label: 'Company size',
    type: 'select',
    placeholder: 'Select',
    options: [
      { value: '1-10', label: '1–10' },
      { value: '11-50', label: '11–50' },
      { value: '51-200', label: '51–200' },
      { value: '201-1000', label: '201–1,000' },
      { value: '1001-5000', label: '1,001–5,000' },
      { value: '5001+', label: '5,001+' },
    ],
  },
  {
    id: 'industry',
    label: 'Industry',
    type: 'select',
    placeholder: 'Select industry',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'education', label: 'Education' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'energy', label: 'Energy' },
      { value: 'government', label: 'Government' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'other', label: 'Other' },
    ],
  },
  { id: 'country', label: 'Country', type: 'text', placeholder: 'United States' },
  { id: 'website', label: 'Company website', type: 'text', placeholder: 'https://example.com' },
  { id: 'has_lms', label: 'Existing LMS / learning platform?', type: 'boolean' },
  {
    id: 'current_systems',
    label: 'Current systems (select all that apply)',
    type: 'multiselect',
    options: [
      { value: 'moodle', label: 'Moodle' },
      { value: 'canvas', label: 'Canvas' },
      { value: 'cornerstone', label: 'Cornerstone' },
      { value: 'successfactors', label: 'SAP SuccessFactors' },
      { value: 'workday_learning', label: 'Workday Learning' },
      { value: 'docebo', label: 'Docebo' },
      { value: 'absorb', label: 'Absorb' },
      { value: 'custom', label: 'Custom / internal' },
      { value: 'none', label: 'None' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'integration_targets',
    label: 'Integrations needed',
    type: 'multiselect',
    options: [
      { value: 'slack', label: 'Slack' },
      { value: 'teams', label: 'Microsoft Teams' },
      { value: 'google_workspace', label: 'Google Workspace' },
      { value: 'm365', label: 'Microsoft 365' },
      { value: 'okta', label: 'Okta / SSO' },
      { value: 'hris', label: 'HRIS (e.g., Workday, BambooHR)' },
      { value: 'crm', label: 'CRM (e.g., Salesforce, HubSpot)' },
      { value: 'data_warehouse', label: 'Data Warehouse / Lake' },
      { value: 'billing', label: 'Billing / Procurement' },
    ],
  },
  { id: 'goals', label: 'Primary goals / outcomes', type: 'textarea', placeholder: 'What does success look like?' },
  {
    id: 'pain_points',
    label: 'Top pain points',
    type: 'chips',
    options: [
      { value: 'low_engagement', label: 'Low engagement' },
      { value: 'high_cost', label: 'High content cost' },
      { value: 'slow_delivery', label: 'Slow delivery speed' },
      { value: 'compliance_risk', label: 'Compliance risk' },
      { value: 'fragmented_systems', label: 'Fragmented systems' },
      { value: 'poor_analytics', label: 'Poor analytics' },
      { value: 'skills_gaps', label: 'Skills gaps' },
      { value: 'globalization', label: 'Globalization / localization' },
      { value: 'ip_sensitivity', label: 'IP sensitivity' },
      { value: 'security_concerns', label: 'Security concerns' },
    ],
  },
  {
    id: 'timeline',
    label: 'Desired timeline',
    type: 'select',
    placeholder: 'Select timeline',
    options: [
      { value: 'asap', label: 'ASAP (< 1 month)' },
      { value: '1-3', label: '1–3 months' },
      { value: '3-6', label: '3–6 months' },
      { value: '6-12', label: '6–12 months' },
      { value: '12+', label: '12+ months' },
    ],
  },
  {
    id: 'budget_range',
    label: 'Estimated budget range',
    type: 'select',
    placeholder: 'Select range',
    options: [
      { value: '<10k', label: '< $10k' },
      { value: '10k-50k', label: '$10k–$50k' },
      { value: '50k-150k', label: '$50k–$150k' },
      { value: '150k-500k', label: '$150k–$500k' },
      { value: '500k+', label: '$500k+' },
    ],
  },
  { id: 'stakeholders', label: 'Primary stakeholders / decision makers', type: 'text', placeholder: 'Names / roles' },
  { id: 'success_metrics', label: 'Success metrics', type: 'textarea', placeholder: 'KPIs / measurement plan' },
  {
    id: 'audience',
    label: 'Target audience',
    type: 'multiselect',
    options: [
      { value: 'new_hires', label: 'New hires' },
      { value: 'managers', label: 'Managers' },
      { value: 'ics', label: 'ICs' },
      { value: 'executives', label: 'Executives' },
      { value: 'partners', label: 'Partners' },
      { value: 'customers', label: 'Customers' },
      { value: 'field', label: 'Field workforce' },
      { value: 'global', label: 'Global audience' },
    ],
  },
  {
    id: 'modalities',
    label: 'Delivery modalities',
    type: 'multiselect',
    options: [
      { value: 'self_paced', label: 'Self-paced' },
      { value: 'instructor_led', label: 'Instructor-led' },
      { value: 'blended', label: 'Blended' },
      { value: 'microlearning', label: 'Microlearning' },
      { value: 'cohort', label: 'Cohort-based' },
      { value: 'mobile_first', label: 'Mobile-first' },
      { value: 'virtual_labs', label: 'Virtual labs' },
      { value: 'ar_vr', label: 'AR/VR' },
    ],
  },
  {
    id: 'content_types',
    label: 'Content types',
    type: 'multiselect',
    options: [
      { value: 'compliance', label: 'Compliance' },
      { value: 'technical', label: 'Technical' },
      { value: 'soft_skills', label: 'Soft skills' },
      { value: 'leadership', label: 'Leadership' },
      { value: 'product', label: 'Product' },
      { value: 'sales_enablement', label: 'Sales enablement' },
      { value: 'onboarding', label: 'Onboarding' },
      { value: 'custom', label: 'Custom programs' },
    ],
  },
  {
    id: 'geographies',
    label: 'Geographies',
    type: 'multiselect',
    options: [
      { value: 'na', label: 'North America' },
      { value: 'eu', label: 'Europe' },
      { value: 'apac', label: 'APAC' },
      { value: 'latam', label: 'LATAM' },
      { value: 'me', label: 'Middle East' },
      { value: 'africa', label: 'Africa' },
      { value: 'global', label: 'Global' },
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    type: 'multiselect',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
      { value: 'pt', label: 'Portuguese' },
      { value: 'zh', label: 'Chinese' },
      { value: 'ja', label: 'Japanese' },
      { value: 'ar', label: 'Arabic' },
      { value: 'hi', label: 'Hindi' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance / certifications',
    type: 'multiselect',
    options: [
      { value: 'gdpr', label: 'GDPR' },
      { value: 'soc2', label: 'SOC 2' },
      { value: 'iso27001', label: 'ISO 27001' },
      { value: 'hipaa', label: 'HIPAA' },
      { value: 'ferpa', label: 'FERPA' },
      { value: 'coppa', label: 'COPPA' },
      { value: 'pcidss', label: 'PCI-DSS' },
      { value: 'other', label: 'Other' },
    ],
  },
  { id: 'data_privacy', label: 'Data privacy constraints', type: 'textarea', placeholder: 'Any data residency or privacy restrictions?' },
  { id: 'security_constraints', label: 'Security constraints', type: 'textarea', placeholder: 'Security policies or requirements' },
  { id: 'ip_sensitivity', label: 'Sensitive IP constraints?', type: 'boolean' },
  {
    id: 'contact_preference',
    label: 'Preferred contact method',
    type: 'select',
    placeholder: 'Select',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'video', label: 'Video call' },
    ],
  },
  { id: 'preferred_time', label: 'Preferred time window / timezone', type: 'text', placeholder: 'e.g., 9–11am ET' },
  { id: 'notes', label: 'Anything else we should know?', type: 'textarea' },
]

// Group intake fields into logical sections for responsive tabs/steps
const INTAKE_GROUPS_META: Array<{ id: string; label: string; description?: string; questionIds: string[] }> = [
  {
    id: 'contact_org',
    label: 'Contact & Organization',
    description: 'Basic contact details and organization info',
    questionIds: ['contact_name', 'contact_email', 'role_title', 'company_name', 'website', 'country'],
  },
  {
    id: 'company_profile',
    label: 'Company Profile',
    description: 'Company size, industry, and footprint',
    questionIds: ['company_size', 'industry', 'geographies', 'languages'],
  },
  {
    id: 'systems_integrations',
    label: 'Systems & Integrations',
    description: 'Existing platforms and integration targets',
    questionIds: ['has_lms', 'current_systems', 'integration_targets'],
  },
  {
    id: 'goals_outcomes',
    label: 'Goals & Outcomes',
    description: 'Primary goals, content types, and modalities',
    questionIds: ['goals', 'pain_points', 'content_types', 'modalities', 'audience', 'success_metrics'],
  },
  {
    id: 'scope_constraints',
    label: 'Scope & Constraints',
    description: 'Timeline, budget, stakeholders, and constraints',
    questionIds: ['timeline', 'budget_range', 'stakeholders', 'compliance', 'data_privacy', 'security_constraints', 'ip_sensitivity'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'How and when to connect',
    questionIds: ['contact_preference', 'preferred_time', 'notes'],
  },
]

// LLM prompt to generate elegant, organization-personalized stage titles
const STAGE_TITLES_SYSTEM_PROMPT = `You are Smartslate's Stage Title Namer.
Return JSON ONLY with keys {"stage2": string, "stage3": string, "summary": string}.
Requirements:
- Titles should be relevant, elegant, and personalized to the organization and their goals.
- 2–5 words each, Title Case, no numbering or punctuation at the end.
- Avoid generic terms like "Stage", "Step", or "Summary" in the text itself.
- No brand names unless they are part of the organization's inputs.
- Keep them clear and professional (e.g., "Skills Acceleration Plan", "Rollout Readiness Review").
Output valid JSON with the exact keys: stage2, stage3, summary.`

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

type QuestionFieldProps = { q: Question; value: any; onChange: (v: any) => void }

const QuestionField = memo(function QuestionField({ q, value, onChange }: QuestionFieldProps) {
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
    const options = (q.options || [])
    const optionValues = new Set(options.map(o => o.value))
    const selectValue = value == null || value === '' ? '' : (optionValues.has(value) ? value : '__custom__')
    return (
      <div className="space-y-2">
        <label className="block space-y-2">
          {label}
          <select className="input" value={selectValue} onChange={(e) => onChange(e.target.value === '__custom__' ? (typeof value === 'string' ? value : '') : e.target.value)}>
            <option value="">{q.placeholder || 'Select an option'}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
        </label>
        {selectValue === '__custom__' && (
          <div className="pl-0">
            <input
              className="input"
              placeholder="Type a custom value"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-white/50">Your custom value will be used for this field.</p>
          </div>
        )}
      </div>
    )
  }
  if (q.type === 'multiselect' || q.type === 'chips') {
    const selected: string[] = Array.isArray(value) ? value : []
    const optionValues = new Set((q.options || []).map(o => o.value))
    const combined = [
      ...(q.options || []).map(o => ({ value: o.value, label: o.label })),
      // include custom selections not in options so they render as chips
      ...selected.filter(v => !optionValues.has(v)).map(v => ({ value: v, label: v })),
    ]
    return (
      <div className="space-y-2">
        {label}
        <div className="flex flex-wrap gap-2">
          {combined.map((o) => {
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
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="Add custom item and press Enter"
            onKeyDown={(e) => {
              const t = e.target as HTMLInputElement
              if (e.key === 'Enter') {
                const v = t.value.trim()
                if (v) {
                  const next = new Set(Array.isArray(value) ? value : [])
                  next.add(v)
                  onChange(Array.from(next))
                  t.value = ''
                }
              }
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-white/50">Click to toggle items. Add your own with Enter.</p>
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
}, (prev, next) => prev.value === next.value && prev.q === next.q)

export default function Polaris() {
  const [active, setActive] = useState<'stage1' | 'stage2' | 'stage3' | 'summary'>('stage1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage2Questions, setStage2] = useState<Question[]>([])
  const [stage3Questions, setStage3] = useState<Question[]>([])
  const [answers1, setAnswers1] = useState<Record<string, any>>({})
  const [answers2, setAnswers2] = useState<Record<string, any>>({})
  const [answers3, setAnswers3] = useState<Record<string, any>>({})
  const [analysis, setAnalysis] = useState<string>('')
  const [intakeIndex, setIntakeIndex] = useState<number>(0)
  const [stageTitleOverrides, setStageTitleOverrides] = useState<{ stage2?: string; stage3?: string; summary?: string }>({})
  // Smooth, informative loading overlay state
  const [loader, setLoader] = useState<{ active: boolean; phase?: 'stage2'|'stage3'|'summary'; message: string; progress: number; etaSeconds: number }>({ active: false, message: '', progress: 0, etaSeconds: 0 })
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Validate all intake fields are filled
  const allIntakeIds = INTAKE_QUESTIONS.map(q => q.id)
  const intakeMissing: string[] = allIntakeIds.filter(id => {
    const q = INTAKE_QUESTIONS.find(x => x.id === id)!
    const val = answers1[id]
    if (q.type === 'multiselect' || q.type === 'chips') return !Array.isArray(val) || val.length === 0
    if (q.type === 'boolean') return typeof val !== 'boolean'
    return val === undefined || val === null || String(val).trim() === ''
  })
  const intakeComplete = intakeMissing.length === 0

  // Manual navigation helper for intake groups (with smooth scroll)
  function goToGroup(idx: number) {
    setIntakeIndex(idx)
    const nextId = INTAKE_GROUPS_META[idx]?.id
    if (nextId) {
      window.setTimeout(() => {
        const el = document.getElementById(`intake-panel-${nextId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 10)
    }
  }

  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function startSmartLoader(phase: 'stage2' | 'stage3' | 'summary') {
    const base = phase === 'stage2' ? 8000 : phase === 'stage3' ? 7000 : 6000
    const signal = phase === 'stage2' ? Object.keys(answers1 || {}).length : phase === 'stage3' ? Object.keys(answers2 || {}).length : Object.keys(answers3 || {}).length
    const targetMs = Math.min(14000, Math.max(5500, base + signal * 120))
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const ratio = Math.min(1, elapsed / targetMs)
      const progress = Math.min(95, Math.max(5, Math.round(easeInOutCubic(ratio) * 95)))
      let message = 'Preparing inputs…'
      if (progress > 15) message = 'Gathering context…'
      if (progress > 45) message = phase === 'summary' ? 'Analyzing and drafting proposal…' : 'Creating tailored questions…'
      if (progress > 70) message = 'Refining wording and structure…'
      if (progress > 85) message = 'Finalizing…'
      const etaSeconds = Math.max(1, Math.ceil((targetMs - elapsed) / 1000))
      setLoader({ active: true, phase, message, progress, etaSeconds })
    }
    step()
    if (loaderIntervalRef.current) clearInterval(loaderIntervalRef.current)
    loaderIntervalRef.current = setInterval(step, 180)
  }

  function stopSmartLoader() {
    if (loaderIntervalRef.current) {
      clearInterval(loaderIntervalRef.current)
      loaderIntervalRef.current = null
    }
    setLoader((prev) => ({ ...prev, active: true, progress: 100, message: 'Ready' }))
    window.setTimeout(() => setLoader({ active: false, message: '', progress: 0, etaSeconds: 0 }), 450)
  }

  async function genStage2() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage2')
      // Ask LLM for stage titles using intake responses (do this before stage 2 questions)
      try {
        const titleMessages: ChatMessage[] = [
          { role: 'system', content: STAGE_TITLES_SYSTEM_PROMPT },
          { role: 'user', content: `Organization intake (JSON):\n${JSON.stringify(answers1, null, 2)}\nReturn JSON titles now.` },
        ]
        const titleRes = await callLLM(titleMessages)
        const titles = extractJsonBlock(titleRes.content)
        if (titles && (titles.stage2 || titles.stage3 || titles.summary)) {
          setStageTitleOverrides({
            stage2: typeof titles.stage2 === 'string' ? titles.stage2 : undefined,
            stage3: typeof titles.stage3 === 'string' ? titles.stage3 : undefined,
            summary: typeof titles.summary === 'string' ? titles.summary : undefined,
          })
        }
      } catch {}
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
      stopSmartLoader()
    }
  }

  async function genStage3() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('stage3')
      // Optionally refresh titles with more context (answers2)
      try {
        const titleMessages: ChatMessage[] = [
          { role: 'system', content: STAGE_TITLES_SYSTEM_PROMPT },
          { role: 'user', content: `Organization inputs so far (JSON):\n${JSON.stringify({ answers1, answers2 }, null, 2)}\nReturn JSON titles now.` },
        ]
        const titleRes = await callLLM(titleMessages)
        const titles = extractJsonBlock(titleRes.content)
        if (titles && (titles.stage2 || titles.stage3 || titles.summary)) {
          setStageTitleOverrides((prev) => ({
            stage2: typeof titles.stage2 === 'string' ? titles.stage2 : prev.stage2,
            stage3: typeof titles.stage3 === 'string' ? titles.stage3 : prev.stage3,
            summary: typeof titles.summary === 'string' ? titles.summary : prev.summary,
          }))
        }
      } catch {}
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
      stopSmartLoader()
    }
  }

  async function analyze() {
    try {
      setLoading(true)
      setError(null)
      startSmartLoader('summary')
      // Finalize titles with full context
      try {
        const titleMessages: ChatMessage[] = [
          { role: 'system', content: STAGE_TITLES_SYSTEM_PROMPT },
          { role: 'user', content: `All inputs (JSON):\n${JSON.stringify({ answers1, answers2, answers3 }, null, 2)}\nReturn JSON titles now.` },
        ]
        const titleRes = await callLLM(titleMessages)
        const titles = extractJsonBlock(titleRes.content)
        if (titles && (titles.stage2 || titles.stage3 || titles.summary)) {
          setStageTitleOverrides((prev) => ({
            stage2: typeof titles.stage2 === 'string' ? titles.stage2 : prev.stage2,
            stage3: typeof titles.stage3 === 'string' ? titles.stage3 : prev.stage3,
            summary: typeof titles.summary === 'string' ? titles.summary : prev.summary,
          }))
        }
      } catch {}
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
      stopSmartLoader()
    }
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

  // Extract simple highlights and product mentions from the markdown summary
  function extractHighlights(md: string): { bullets: string[]; products: string[] } {
    const bullets: string[] = []
    const lines = md.split(/\n+/)
    for (const line of lines) {
      const m = line.match(/^[-*]\s+(.*)/)
      if (m) bullets.push(m[1].trim())
      if (bullets.length >= 6) break
    }
    const productCatalog = [
      'Ignite Series',
      'Strategic Skills Architecture',
      'Solara', 'Polaris', 'Constellation', 'Nova', 'Orbit', 'Nebula', 'Spectrum',
    ]
    const lower = md.toLowerCase()
    const products = Array.from(new Set(productCatalog.filter(p => lower.includes(p.toLowerCase()))))
    return { bullets, products }
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function exportMarkdownAsPdf(node: HTMLElement, title = 'Smartslate-Polaris-Summary') {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
    const imgWidth = canvas.width * ratio
    const imgHeight = canvas.height * ratio
    const x = (pageWidth - imgWidth) / 2
    const y = 24
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
    pdf.save(`${title}.pdf`)
  }

  const summaryRef = useRef<HTMLDivElement | null>(null)

  // Dynamic labels for later stages based on inputs
  const orgName = (answers1.company_name || '').toString().trim()
  const primaryGoal = (answers1.goals || '').toString().split(/\n|\.\s/)[0]?.trim()
  const stage2Label = stageTitleOverrides.stage2 || (orgName && primaryGoal ? `Deep‑Dive: ${orgName}` : 'Stage 2')
  const stage3Label = stageTitleOverrides.stage3 || (orgName ? `Finalization: ${orgName}` : 'Stage 3')
  const summaryLabel = stageTitleOverrides.summary || (orgName ? `Summary: ${orgName}` : 'Summary')

  // Horizontal stepper to visualize active stage
  function Stepper() {
    const steps: Array<{ key: 'stage1' | 'stage2' | 'stage3' | 'summary'; label: string }> = [
      { key: 'stage1', label: 'First Contact Intake' },
      { key: 'stage2', label: stage2Label },
      { key: 'stage3', label: stage3Label },
      { key: 'summary', label: summaryLabel },
    ]
    const order: Array<'stage1' | 'stage2' | 'stage3' | 'summary'> = ['stage1', 'stage2', 'stage3', 'summary']
    const currentIndex = order.indexOf(active)
    const progress = Math.max(0, Math.min(1, currentIndex / (steps.length - 1)))

    return (
      <>
        {/* Mobile: progress bar + current label */}
        <div className="md:hidden flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-xs text-white/70 whitespace-nowrap">{Math.min(currentIndex + 1, steps.length)} / {steps.length}</span>
        </div>
        <div className="md:hidden mt-2">
          <span className="inline-block max-w-full truncate px-2 py-1 text-[11px] rounded-full bg-white/10 border border-white/10 text-white/80">{steps[currentIndex]?.label || ''}</span>
        </div>

        {/* Desktop: stepper list (progress rail drawn by parent container) */}
        <div className="hidden md:block">
          <ol className="flex items-center gap-4 flex-nowrap whitespace-nowrap w-max">
            {steps.map((s, idx) => {
              const isCompleted = idx < currentIndex
              const isActive = idx === currentIndex
              const baseBtn = 'pressable flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs md:text-sm backdrop-blur-sm'
              const stateBtn = isActive
                ? 'border-primary-400 bg-white/10 shadow-[0_0_0_2px_rgba(167,218,219,0.2)_inset]'
                : isCompleted
                ? 'border-primary-400/40 bg-primary-400/10 text-primary-200'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
              return (
                <li key={s.key} className="flex items-center gap-4">
                  <button
                    type="button"
                    title={s.label}
                    onClick={() => setActive(s.key)}
                    className={`${baseBtn} ${stateBtn}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${isCompleted ? 'bg-primary-400 text-slate-900' : isActive ? 'bg-gradient-to-b from-white/90 to-primary-400/80 text-slate-900' : 'bg-white/10 text-white/70'}`}>{isCompleted ? '✓' : (idx + 1)}</span>
                    <span className={`max-w-[240px] truncate font-medium ${isActive ? 'text-white' : isCompleted ? 'text-primary-200' : 'text-white/85'}`}>{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </>
    )
  }

  return (
    <div className="px-4 py-6 page-enter">
      {loader.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="glass-card p-5 md:p-6 w-[92%] max-w-md shadow-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 animate-pulse" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-semibold text-white/90">
                  {loader.phase === 'summary' ? 'Preparing your proposal' : 'Setting up your next step'}
                </div>
                <div className="text-xs text-white/70">{loader.message}</div>
              </div>
              <div className="text-[11px] text-white/60 whitespace-nowrap">~{String(Math.floor(loader.etaSeconds / 60)).padStart(1,'0')}:{String(loader.etaSeconds % 60).padStart(2,'0')} left</div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all duration-200" style={{ width: `${loader.progress}%` }} />
              </div>
              <div className="mt-2 text-right text-[11px] text-white/60">{loader.progress}%</div>
            </div>
            <div className="mt-3 text-[11px] text-white/50">This takes a few seconds as we tailor content to your inputs.</div>
          </div>
        </div>
      )}
      <div className="mb-5">
        <div className="glass-card p-4 md:p-6 elevate relative">
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
          {/* Bottom-aligned progress rail spanning the parent container */}
          <div
            className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/10 pointer-events-none"
            style={{ borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}
            aria-hidden="true"
          />
          <div
            className="absolute left-0 bottom-0 h-[2px] bg-primary-400 transition-all duration-500 pointer-events-none"
            style={{
              width: `${Math.max(0, Math.min(1, (['stage1','stage2','stage3','summary'].indexOf(active) / Math.max(1, (['stage1','stage2','stage3','summary'].length - 1))))) * 100}%`,
              borderBottomLeftRadius: 'inherit',
              borderBottomRightRadius: 'inherit',
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border-l-4 border-red-400/80 bg-red-500/10 p-3 text-red-200 text-sm">{error}</div>
      )}

      {active === 'stage1' && (() => {
        const intakeGroups = INTAKE_GROUPS_META.map(g => ({
          ...g,
          questions: g.questionIds
            .map(id => INTAKE_QUESTIONS.find(q => q.id === id))
            .filter(Boolean) as Question[],
        }))
        const current = intakeGroups[intakeIndex] || intakeGroups[0]
        const total = intakeGroups.length
        const isFirst = intakeIndex === 0
        const isLast = intakeIndex === total - 1
        return (
          <section className="space-y-4">
            {/* Desktop: tabs */}
            <div className="hidden md:block">
              <div role="tablist" aria-label="Intake sections" className="flex items-center gap-2 overflow-x-auto stepper-scroll">
                {intakeGroups.map((g, idx) => {
                  const selected = idx === intakeIndex
                  const isAnswered = (qid: string) => {
                    const q = INTAKE_QUESTIONS.find(x => x.id === qid)!
                    const v = answers1[qid]
                    if (q.type === 'multiselect' || q.type === 'chips') return Array.isArray(v) && v.length > 0
                    if (q.type === 'boolean') return typeof v === 'boolean'
                    return v !== undefined && v !== null && String(v).trim() !== ''
                  }
                  const requiredIds = g.questionIds.filter(id => {
                    const q = INTAKE_QUESTIONS.find(x => x.id === id)!
                    return Boolean(q.required)
                  })
                  const requiredComplete = requiredIds.length > 0 && requiredIds.every(isAnswered)
                  const answeredCount = g.questionIds.filter(isAnswered).length
                  const threshold = Math.ceil(g.questionIds.length / 2)
                  const groupComplete = requiredIds.length > 0 ? requiredComplete : answeredCount >= threshold
                  return (
                    <button
                      key={g.id}
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`intake-panel-${g.id}`}
                      id={`intake-tab-${g.id}`}
                      type="button"
                      onClick={() => goToGroup(idx)}
                      className={`pressable rounded-full px-3 py-1.5 border text-xs md:text-sm whitespace-nowrap ${selected ? 'border-primary-400 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/85 hover:bg-white/10'}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {g.label}
                        <span className={`ml-1 h-1.5 w-1.5 rounded-full ${groupComplete ? 'bg-green-400' : 'bg-amber-300'} ring-1 ring-black/30`} aria-label={groupComplete ? 'Complete' : 'Incomplete'} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* Desktop: next section control moved to bottom actions */}
            </div>

            {/* Mobile: progress + pager controls */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-400 rounded-full transition-all duration-300" style={{ width: `${((intakeIndex + 1) / total) * 100}%` }} />
                </div>
                <span className="text-xs text-white/70 whitespace-nowrap">{intakeIndex + 1} / {total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">{current.label}</div>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setIntakeIndex(v => Math.max(0, v - 1))} disabled={isFirst}>Back</button>
                  {(() => {
                    const requiredIds = current.questions.filter(q => q.required).map(q => q.id)
                    const currentRequiredComplete = requiredIds.length === 0 ? true : requiredIds.every(id => {
                      const q = INTAKE_QUESTIONS.find(x => x.id === id)!
                      const v = answers1[id]
                      if (q.type === 'multiselect' || q.type === 'chips') return Array.isArray(v) && v.length > 0
                      if (q.type === 'boolean') return typeof v === 'boolean'
                      return v !== undefined && v !== null && String(v).trim() !== ''
                    })
                    const showNextArrow = currentRequiredComplete && !isLast
                    return showNextArrow ? (
                      <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => goToGroup(Math.min(total - 1, intakeIndex + 1))}>Next</button>
                    ) : null
                  })()}
                </div>
              </div>
              <p className="text*[11px] text-white/50">Complete this section to continue. Tabs show a green dot when complete and yellow when pending.</p>
            </div>

            {/* Active panel */}
            <div
              role="tabpanel"
              id={`intake-panel-${current.id}`}
              aria-labelledby={`intake-tab-${current.id}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 animate-fade-in-up">
                {current.questions.map((q) => (
                  <div key={q.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                    <span className="interactive-spotlight" />
                    <QuestionField q={q} value={answers1[q.id]} onChange={(v) => setAnswers1((prev) => ({ ...prev, [q.id]: v }))} />
                  </div>
                ))}
              </div>
              {current.description && (
                <p className="mt-2 text-xs text-white/60">{current.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setAnswers1({})}>Reset</button>
                <div className="hidden md:block text-xs text-white/60">Fill required fields to unlock navigation.</div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const requiredIds = current.questions.filter(q => q.required).map(q => q.id)
                  const currentRequiredComplete = requiredIds.length === 0 ? true : requiredIds.every(id => {
                    const q = INTAKE_QUESTIONS.find(x => x.id === id)!
                    const v = answers1[id]
                    if (q.type === 'multiselect' || q.type === 'chips') return Array.isArray(v) && v.length > 0
                    if (q.type === 'boolean') return typeof v === 'boolean'
                    return v !== undefined && v !== null && String(v).trim() !== ''
                  })
                  const canGoNextSection = currentRequiredComplete && !isLast
                  return canGoNextSection ? (
                    <button type="button" className="btn-ghost px-3 py-2 text-sm hidden md:inline-flex" onClick={() => goToGroup(Math.min(total - 1, intakeIndex + 1))}>Next Section</button>
                  ) : null
                })()}
                <button
                  type="button"
                  className={`btn-primary text-sm hidden md:inline-flex ${intakeComplete ? '' : 'opacity-60 cursor-not-allowed'}`}
                  onClick={genStage2}
                  disabled={loading || !intakeComplete}
                >
                  {loading ? 'Generating…' : `Continue to ${stage2Label}`}
                </button>
                <button
                  type="button"
                  className={`btn-primary text-sm md:hidden ${(isLast && intakeComplete) ? '' : 'opacity-60 cursor-not-allowed'}`}
                  onClick={() => { if (isLast && intakeComplete) genStage2() }}
                  disabled={loading || !isLast || !intakeComplete}
                >
                  {loading ? 'Generating…' : (isLast ? (intakeComplete ? `Continue to ${stage2Label}` : 'Complete all sections') : 'Continue')}
                </button>
              </div>
            </div>
          </section>
        )
      })()}

      {active === 'stage2' && (
        <section className="space-y-4">
          {stage2Questions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {stage2Questions.map((q) => (
                <div key={q.id} className="glass-card group p-4 md:p-5 relative overflow-hidden">
                  <span className="interactive-spotlight" />
                  <QuestionField q={q} value={answers2[q.id]} onChange={(v) => setAnswers2((prev) => ({ ...prev, [q.id]: v }))} />
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
                  <QuestionField q={q} value={answers3[q.id]} onChange={(v) => setAnswers3((prev) => ({ ...prev, [q.id]: v }))} />
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
          {!analysis ? (
            <div className="text-sm text-white/60">Run the analysis to see a tailored proposal mapped to Ignite / Strategic Skills Architecture / Solara.</div>
          ) : (
            <div className="space-y-4">
              {/* Summary header actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Proposal Summary</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => navigator.clipboard.writeText(analysis || '')}>Copy</button>
                  <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => downloadText('Smartslate-Polaris-Summary.md', analysis || '')}>Download .md</button>
                  <button type="button" className="btn-primary text-sm" onClick={() => { if (summaryRef.current) exportMarkdownAsPdf(summaryRef.current) }}>Export PDF</button>
                </div>
              </div>

              {/* Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
                {/* Main proposal */}
                <div className="lg:col-span-2">
                  <div ref={summaryRef} className="glass-card p-4 md:p-6">
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(analysis) }} />
                  </div>
                </div>
                {/* Sidebar insights */}
                <div className="space-y-4">
                  {(() => {
                    const { bullets, products } = extractHighlights(analysis)
                    return (
                      <>
                        <div className="glass-card p-4 md:p-5">
                          <h4 className="text-sm font-semibold mb-2 text-white/90">Key Takeaways</h4>
                          {bullets.length ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                              {bullets.map((b, i) => (<li key={i}>{b}</li>))}
                            </ul>
                          ) : (
                            <p className="text-sm text-white/60">Highlights will appear here once analysis includes bullets.</p>
                          )}
                        </div>
                        <div className="glass-card p-4 md:p-5">
                          <h4 className="text-sm font-semibold mb-2 text-white/90">Recommended Products</h4>
                          {products.length ? (
                            <div className="flex flex-wrap gap-2">
                              {products.map(p => (
                                <span key={p} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/90 text-xs">{p}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-white/60">Products detected from the summary will appear here.</p>
                          )}
                        </div>
                      </>
                    )
                  })()}
                  <div className="glass-card p-4 md:p-5">
                    <h4 className="text-sm font-semibold mb-2 text-white/90">Next Steps</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-white/80">
                      <li>Review proposal with stakeholders</li>
                      <li>Confirm scope, budget, and timeline</li>
                      <li>Schedule discovery workshop with Smartslate</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setActive('stage1')}>Start Over</button>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-white/60">Developer debug: raw JSON</summary>
                <pre className="text-xs bg-white/5 p-3 rounded-md overflow-auto border border-white/10 text-white/80">{JSON.stringify({ answers1, answers2, answers3, stage2Questions, stage3Questions, intakeQuestions: INTAKE_QUESTIONS.map(q => q.id) }, null, 2)}</pre>
              </details>
            </div>
          )}
        </section>
      )}
    </div>
  )
}


