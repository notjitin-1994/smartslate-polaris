import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, Building } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { StarmapProgressIndicator as ProgressIndicator } from './StarmapProgressIndicator'
import { QuestionnaireHeader } from '../shared/QuestionnaireHeader'
import { RequestorInfoStep } from './RequestorInfoStep'
import { GroupInfoStep } from './GroupInfoStep'
import { DynamicLoadingScreen } from '@/components/DynamicLoadingScreen'
import { DynamicQuestionnaire } from '@/components/forms/DynamicQuestionnaire'
import { HEADER_TITLE, getStaticSubheading, getLoadingSubheading } from '../shared/headerCopy'
import { 
  validateRequestorInfo, 
  validateGroupInfo, 
  isStepValid 
} from './validation'
import type { 
  StarmapRequestFormProps, 
  RequestorInfo, 
  GroupInfo, 
  ValidationError, 
  FormStep 
} from './types'
import { updateStarmap } from '@/services'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'

// --- Supabase payload types & helpers ---
type YourInfoPayload = {
  full_name: string | null
  work_email: string | null
  role_title: string | null
  phone_number: string | null
  preferred_contact_method: 'email' | 'phone' | 'other' | null
  context_goals: string | null
}

type GroupDetailsPayload = {
  group_name: string | null
  group_type: string | null
  industry: string | null
  group_size: number | null
  primary_stakeholders: string[] | null
  desired_outcomes: string | null
  timeline_target: string | null
  constraints_notes: string | null
}

function normalizeContact(x?: string): 'email' | 'phone' | 'other' | null {
  if (!x) return null
  const v = x.toLowerCase()
  return v === 'email' || v === 'phone' || v === 'other' ? v : null
}

function parseIntOrNull(v?: string): number | null {
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) ? n : null
}

function splitCSV(v?: string | string[]): string[] | null {
  if (Array.isArray(v)) {
    const arr = v.map(s => (s || '').trim()).filter(Boolean)
    return arr.length ? arr : null
  }
  if (!v) return null
  const arr = v.split(',').map(s => s.trim()).filter(Boolean)
  return arr.length ? arr : null
}

// Map range labels (e.g., '11-50') to an integer upper bound for storage
function mapGroupSizeToInt(value?: string): number | null {
  if (!value) return null
  if (value === 'not-sure') return null
  if (value === '1000+') return 1000
  const m = value.match(/^(\d+)-(\d+)$/)
  if (m) return parseInt(m[2], 10)
  return parseIntOrNull(value)
}

// Build static_answers stage payloads mirroring dynamic_answers structure
function buildStaticRequestorStagePayload(data: Partial<RequestorInfo>) {
  const payload: Record<string, any> = {}
  const entries: Array<{ id: string; text: string; value: any }> = [
    { id: 'full_name', text: 'Full Name', value: (data as any)?.fullName },
    { id: 'work_email', text: 'Work Email', value: (data as any)?.workEmail },
    { id: 'role_title', text: 'Role / Title', value: (data as any)?.role },
    { id: 'phone_number', text: 'Phone Number', value: (data as any)?.phone },
    { id: 'preferred_contact_method', text: 'Preferred Contact Method', value: normalizeContact((data as any)?.preferredContact) },
    { id: 'context_goals', text: 'Context & Goals', value: (data as any)?.context },
  ]
  for (const { id, text, value } of entries) {
    if (value !== undefined && value !== null && `${value}` !== '') {
      payload[id] = { question_id: id, question_text: text, user_answer: value }
    }
  }
  return payload
}

function buildStaticGroupStagePayload(data: Partial<GroupInfo>) {
  const payload: Record<string, any> = {}
  const entries: Array<{ id: string; text: string; value: any }> = [
    { id: 'group_name', text: 'Group Name', value: (data as any)?.groupName },
    { id: 'group_type', text: 'Group Type', value: (data as any)?.groupType },
    { id: 'industry', text: 'Industry / Discipline', value: (data as any)?.industry },
    { id: 'size', text: 'Group Size', value: (data as any)?.size },
    { id: 'primary_stakeholders', text: 'Primary Stakeholders', value: (data as any)?.primaryStakeholders },
    { id: 'desired_outcomes', text: 'Desired Outcomes & Success Criteria', value: (data as any)?.desiredOutcomes },
    { id: 'timeline_target', text: 'Timeline Target', value: (data as any)?.timelineTarget },
    { id: 'constraints_notes', text: 'Constraints or Additional Notes', value: (data as any)?.constraints },
  ]
  for (const { id, text, value } of entries) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        payload[id] = { question_id: id, question_text: text, user_answer: value }
      }
    } else if (value !== undefined && value !== null && `${value}` !== '') {
      payload[id] = { question_id: id, question_text: text, user_answer: value }
    }
  }
  return payload
}

async function saveStaticStageAnswers(params: {
  recordId: string | null
  stageKey: 'requestor' | 'group'
  stagePayload: Record<string, any>
  setShowSaveIndicator?: (v: boolean) => void
}) {
  const { recordId, stageKey, stagePayload, setShowSaveIndicator } = params
  if (!recordId) return
  if (Object.keys(stagePayload).length === 0) return
  try {
    // Merge on client to avoid dependency on DB RPC availability
    const { data, error: readErr } = await supabase
      .from('master_discovery')
      .select('static_answers')
      .eq('id', recordId)
      .single()
    if (readErr) throw readErr
    const serverAnswers = (data && (data as any).static_answers) || {}
    const prevStageBlock = (serverAnswers && (serverAnswers as any)[stageKey]) || {}
    const mergedStage = { ...prevStageBlock, ...stagePayload }
    const merged = { ...serverAnswers, [stageKey]: mergedStage }
    const { error: updateErr } = await supabase
      .from('master_discovery')
      .update({ static_answers: merged })
      .eq('id', recordId)
    if (updateErr) throw updateErr
    if (setShowSaveIndicator) {
      setShowSaveIndicator(true)
      setTimeout(() => setShowSaveIndicator(false), 2000)
    }
  } catch (fallbackErr) {
    console.error('Error saving static answers:', fallbackErr)
  }
}

// Hydrate helpers: convert static_answers JSON to form state shapes
function parseRequestorStageToForm(stageBlock: any): Partial<RequestorInfo> {
  if (!stageBlock || typeof stageBlock !== 'object') return {}
  const get = (k: string) => stageBlock?.[k]?.user_answer
  const preferred = get('preferred_contact_method')
  return {
    fullName: get('full_name') ?? '',
    workEmail: get('work_email') ?? '',
    role: get('role_title') ?? '',
    phone: get('phone_number') ?? '',
    preferredContact: preferred === 'email' || preferred === 'phone' || preferred === 'other' ? preferred : 'email',
    context: get('context_goals') ?? ''
  }
}

function parseGroupStageToForm(stageBlock: any): Partial<GroupInfo> {
  if (!stageBlock || typeof stageBlock !== 'object') return {}
  const get = (k: string) => stageBlock?.[k]?.user_answer
  const primary = get('primary_stakeholders')
  return {
    groupName: get('group_name') ?? '',
    groupType: get('group_type') ?? '',
    industry: get('industry') ?? '',
    size: get('size') ?? '',
    primaryStakeholders: Array.isArray(primary) ? primary : (typeof primary === 'string' && primary ? primary.split(',').map(s => s.trim()).filter(Boolean) : []),
    desiredOutcomes: get('desired_outcomes') ?? '',
    timelineTarget: get('timeline_target') ?? '',
    constraints: get('constraints_notes') ?? ''
  }
}

// Snackbar component for success message
function SuccessSnackbar({ show, onClose }: { show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-green-500/20 border border-green-500/30 backdrop-blur-lg rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Details captured successfully!</p>
              <p className="text-white/70 text-sm">We'll follow up shortly.</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const STORAGE_KEY = 'starmap-form-data'
const AUTOSAVE_DELAY = 1000 // 1 second

export function StarmapRequestForm({ onComplete, initialStep = 'requestor', starmapId, initialData, loading: loadingProp }: StarmapRequestFormProps) {
  const navigate = useNavigate()
  const [showSaveIndicator, setShowSaveIndicator] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [dynamicQuestions, setDynamicQuestions] = useState<any>(null)
  
  // Load saved data from localStorage
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        return {
          requestor: data.requestor || { preferredContact: 'email' },
          group: data.group || { primaryStakeholders: [] },
          currentStep: data.currentStep || initialStep
        }
      }
      if (initialData) {
        return {
          requestor: initialData.requestor || { preferredContact: 'email' },
          group: initialData.group || { primaryStakeholders: [] },
          currentStep: initialStep
        }
      }
    } catch (error) {
      console.error('Failed to load saved form data:', error)
    }
    return {
      requestor: { preferredContact: 'email' },
      group: { primaryStakeholders: [] },
      currentStep: initialStep
    }
  }

  const savedData = loadSavedData()
  
  const [currentStep, setCurrentStep] = useState<FormStep>(savedData.currentStep)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isExiting, setIsExiting] = useState(false)
  const [exitKey, setExitKey] = useState(0)

  const scrollToTopSmooth = (): Promise<void> => {
    return new Promise(resolve => {
      try {
        if (typeof window !== 'undefined') {
          if ('scrollTo' in window) {
            window.scrollTo({ top: 0, behavior: 'auto' })
          } else {
            window.scrollTo(0, 0)
          }
          const doc = document as any
          if (doc?.documentElement) doc.documentElement.scrollTop = 0
          if (doc?.body) doc.body.scrollTop = 0
        }
      } catch {
        try { window.scrollTo(0, 0) } catch {}
      }
      setTimeout(resolve, 60)
    })
  }
  

  // Rehydrate master_discovery record id and check for existing session
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        // If a starmapId is provided, prefer it and do not auto-jump to questionnaire here.
        if (starmapId) {
          setRecordId(starmapId)
          return
        }

        // Otherwise, resume from last local session
        const saved = localStorage.getItem('md_record_id')
        if (saved) {
          setRecordId(saved)
          
          // Check if dynamic questions already exist for saved session and hydrate static form
          const { data } = await supabase
            .from('master_discovery')
            .select('dynamic_questions, dynamic_answers, static_answers, status')
            .eq('id', saved)
            .single()
          
          const hasStages = Array.isArray((data as any)?.dynamic_questions?.stages)
          const hasArray = Array.isArray((data as any)?.dynamic_questions)
          const isNonEmpty = (hasStages && (data as any).dynamic_questions.stages.length > 0) || (hasArray && (data as any).dynamic_questions.length > 0)
          if (isNonEmpty) {
            setDynamicQuestions(data.dynamic_questions)
            if (data.status === 'in_progress') {
              setShowQuestionnaire(true)
            }
          }

          // Hydrate static form state from static_answers if present; otherwise from individual columns
          const staticAnswers = (data as any)?.static_answers || {}
          const reqBlock = (staticAnswers && staticAnswers.requestor) || null
          const grpBlock = (staticAnswers && staticAnswers.group) || null

          const hydratedRequestor = reqBlock ? parseRequestorStageToForm(reqBlock) : requestorData
          const hydratedGroup = grpBlock ? parseGroupStageToForm(grpBlock) : groupData

          setRequestorData(hydratedRequestor)
          setGroupData(hydratedGroup)
        }
      } catch (error) {
        console.error('Failed to load existing session:', error)
      }
    }
    
    loadExistingSession()
  }, [starmapId])
  
  // Form data state
  const [requestorData, setRequestorData] = useState<Partial<RequestorInfo>>(savedData.requestor)
  const [groupData, setGroupData] = useState<Partial<GroupInfo>>(savedData.group)

  // Validation errors
  const [requestorErrors, setRequestorErrors] = useState<ValidationError[]>([])
  const [groupErrors, setGroupErrors] = useState<ValidationError[]>([])

  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  // Debounced values for validation
  const debouncedRequestorData = useDebounce(requestorData, 300)
  const debouncedGroupData = useDebounce(groupData, 300)
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + N for next step
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (currentStep === 'requestor' && isStepValid('requestor', requestorData)) {
          setCurrentStep('group')
        }
      }
      // Alt + P for previous step
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (currentStep === 'group') {
          setCurrentStep('requestor')
        }
      }
      // Alt + S to submit/continue (mirrors clicking the primary button)
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        // Delegate to the same flow as the form submit button
        // This will validate and either advance or submit
        handleContinue()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, requestorData, groupData])
  
  // Validate on data change (with debounce)
  useEffect(() => {
    if (Object.keys(touched).some(key => key.startsWith('requestor'))) {
      setRequestorErrors(validateRequestorInfo(debouncedRequestorData))
    }
  }, [debouncedRequestorData, touched])

  useEffect(() => {
    if (Object.keys(touched).some(key => key.startsWith('group'))) {
      setGroupErrors(validateGroupInfo(debouncedGroupData))
    }
  }, [debouncedGroupData, touched])

  // Auto-save to localStorage + server
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        const dataToSave = {
          requestor: requestorData,
          group: groupData,
          currentStep,
          savedAt: new Date().toISOString()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        setLastSaved(new Date())
        setShowSaveIndicator(true)
        setTimeout(() => setShowSaveIndicator(false), 2000)
      } catch (error) {
        console.error('Failed to save form data:', error)
      }
      // Persist to server when starmapId is available (only send supported columns)
      ;(async () => {
        if (!starmapId) return
        try {
          await updateStarmap(starmapId, {
            // Only guaranteed column we send by default is 'title'.
            // If your table has a 'title' column, we derive it from Group Name or Requestor Name.
            title: (groupData as any)?.groupName || (requestorData as any)?.fullName || null,
          } as any)
        } catch (err) {
          console.error('Failed to sync form to server:', err)
        }
      })()
    }, AUTOSAVE_DELAY)

    return () => clearTimeout(saveTimer)
  }, [requestorData, groupData, currentStep])

  // Display loading skeleton when loading initial data from server
  if (loadingProp) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
        <header className="relative bg-[rgb(var(--bg))] border-b border-white/5 overflow-hidden">
          <div className="relative z-10 max-w-5xl mx-auto py-12 px-4">
            <div className="h-10 w-96 bg-white/10 rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
          </div>
        </header>
        
        <main className="relative z-10 px-4 pb-16">
          <div className="max-w-5xl mx-auto mt-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-pulse h-[600px]" />
          </div>
        </main>
      </div>
    )
  }

  // Removed the intermediate submitting screen to avoid flicker; the dynamic loader will take over

  // Animation variants - matching dynamic questionnaire
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -30 : 30,
      opacity: 0
    })
  }

  const transition = prefersReducedMotion 
    ? { duration: 0 }
    : { duration: 0.4, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }

  // Update requestor data
  const updateRequestorData = (field: keyof RequestorInfo, value: any) => {
    setRequestorData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [`requestor.${field}`]: true }))
  }

  // Update group data
  const updateGroupData = (field: keyof GroupInfo, value: any) => {
    setGroupData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [`group.${field}`]: true }))
  }

  // Reset static form state to initial empty values
  const resetStaticFormState = () => {
    setCurrentStep('requestor')
    setRequestorData({ preferredContact: 'email' })
    setGroupData({ primaryStakeholders: [] })
    setTouched({})
    setRequestorErrors([])
    setGroupErrors([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  // Create/continue handler: create or update master_discovery draft
  const onContinue = async (): Promise<boolean> => {
    try {
      // Validate requestor info here as onClick bypasses form onSubmit
      const errors = validateRequestorInfo(requestorData)
      setRequestorErrors(errors)
      const requestorFields = ['fullName', 'workEmail', 'role', 'phone', 'preferredContact', 'context']
      requestorFields.forEach(field => {
        setTouched(prev => ({ ...prev, [`requestor.${field}`]: true }))
      })
      if (errors.length > 0) {
        toast.error('Please fix the highlighted fields.')
        return false
      }
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        toast.error('You must be signed in.')
        return false
      }

      // Debug snapshot to verify mappings
      console.debug('[MD] onContinue requestorData ->', requestorData)

      if ((requestorData as any)?.workEmail && !String((requestorData as any)?.workEmail).includes('@')) {
        toast.error('Please enter a valid email.')
        return false
      }

      if (recordId) {
        // Save requestor static answers into JSONB (stage: requestor)
        const requestorStagePayload = buildStaticRequestorStagePayload(requestorData)
        await saveStaticStageAnswers({
          recordId,
          stageKey: 'requestor',
          stagePayload: requestorStagePayload,
          setShowSaveIndicator: setShowSaveIndicator
        })

        toast.success('Your information has been saved.')
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        await scrollToTopSmooth()
        setIsExiting(true)
        setExitKey(Date.now())
        await new Promise(r => setTimeout(r, 250))
        setCurrentStep('group')
        setIsExiting(false)
        return true
      } else {
        const { data, error } = await supabase
          .from('master_discovery')
          .insert([{ user_id: user.id, status: 'draft' } as any])
          .select('id')
          .single()
        if (error) throw error
        console.debug('[MD] insert result ->', data)
        setRecordId(data.id)
        try { localStorage.setItem('md_record_id', data.id) } catch {}

        // Save requestor static answers into JSONB (stage: requestor) for new record
        const requestorStagePayload = buildStaticRequestorStagePayload(requestorData)
        await saveStaticStageAnswers({
          recordId: data.id,
          stageKey: 'requestor',
          stagePayload: requestorStagePayload,
          setShowSaveIndicator: setShowSaveIndicator
        })

        toast.success('Your information has been saved.')
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        await scrollToTopSmooth()
        setIsExiting(true)
        setExitKey(Date.now())
        await new Promise(r => setTimeout(r, 250))
        setCurrentStep('group')
        setIsExiting(false)
        return true
      }
    } catch (e) {
      console.error(e)
      toast.error('Something went wrong. Please try again.')
      return false
    }
  }

  // Submit handler: update draft with group details and mark submitted
  const onSubmitRequest = async (): Promise<void> => {
    try {
      setIsSubmitting(true)
      // Validate group info here as onClick bypasses form onSubmit
      const errors = validateGroupInfo(groupData)
      setGroupErrors(errors)
      const groupFields = ['groupName', 'groupType', 'industry', 'size', 'primaryStakeholders', 'desiredOutcomes', 'timelineTarget', 'constraints']
      groupFields.forEach(field => {
        setTouched(prev => ({ ...prev, [`group.${field}`]: true }))
      })
      if (errors.length > 0) {
        toast.error('Please fix the highlighted fields.')
        setIsSubmitting(false)
        return
      }
      if (!recordId) {
        toast.error('No draft found. Please press Continue first.')
        setIsSubmitting(false)
        return
      }

      // First, check if dynamic questions already exist and compare data via static_answers
      const { data: existingData, error: fetchError } = await supabase
        .from('master_discovery')
        .select('id, dynamic_questions, static_answers')
        .eq('id', recordId)
        .single()

      if (fetchError) throw fetchError

      const existingStatic = (existingData as any)?.static_answers || {}
      const prevRequestor = existingStatic.requestor || {}
      const prevGroup = existingStatic.group || {}
      const newRequestor = buildStaticRequestorStagePayload(requestorData)
      const newGroup = buildStaticGroupStagePayload(groupData)
      const hasDataChanged = JSON.stringify(prevRequestor) !== JSON.stringify(newRequestor) || JSON.stringify(prevGroup) !== JSON.stringify(newGroup)

      // If questions exist and data hasn't changed, skip generation
      if ((existingData as any).dynamic_questions && !hasDataChanged) {
        console.log('Using existing dynamic questions - no data changes detected')
        await scrollToTopSmooth()
        setIsExiting(true)
        setExitKey(Date.now())
        await new Promise(r => setTimeout(r, 250))
        setDynamicQuestions((existingData as any).dynamic_questions)
        setShowQuestionnaire(true)
        setIsExiting(false)
        setIsSubmitting(false)
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        resetStaticFormState()
        return
      }

      // Persist static group answers to JSONB (stage: group)
      const groupStagePayload = buildStaticGroupStagePayload(groupData)
      await saveStaticStageAnswers({
        recordId,
        stageKey: 'group',
        stagePayload: groupStagePayload,
        setShowSaveIndicator: setShowSaveIndicator
      })

      // Skip explicit status update to avoid 400 Bad Request due to DB constraints on master_discovery

      // Reset static form on successful save and immediately show loader
      await scrollToTopSmooth()
      setIsExiting(true)
      setExitKey(Date.now())
      await new Promise(r => setTimeout(r, 250))
      resetStaticFormState()
      setShowLoadingScreen(true)
      setIsExiting(false)
      setIsSubmitting(false)

      // Generate dynamic questions via serverless API (only if data changed or no questions exist)
      try {
        const resp = await fetch('/api/dynamic-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId })
        })
        if (!resp.ok) {
          const body = await resp.text()
          console.error('Dynamic questions generation failed:', body)
          toast.error('Failed to generate dynamic questions. Please try again.')
          setShowLoadingScreen(false)
          try { window.location.href = '/' } catch {}
          return
        }
        const { dynamic_questions } = await resp.json()
        console.debug('[MD] dynamic_questions saved ->', dynamic_questions)
        setDynamicQuestions(dynamic_questions)
      } catch (dqErr) {
        console.error('Dynamic questions request error:', dqErr)
        toast.error('Could not contact AI service. Please try again.')
        setShowLoadingScreen(false)
        return
      }

      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem('md_record_id')
      } catch {}
    } catch (e) {
      console.error(e)
      toast.error('Submission failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Handle step navigation
  const handleContinue = async () => {
    if (currentStep === 'requestor') {
      // Validate requestor info
      const errors = validateRequestorInfo(requestorData)
      setRequestorErrors(errors)
      
      // Mark all fields as touched
      const requestorFields = ['fullName', 'workEmail', 'role', 'phone', 'preferredContact', 'context']
      requestorFields.forEach(field => {
        setTouched(prev => ({ ...prev, [`requestor.${field}`]: true }))
      })

      if (errors.length === 0) {
        await onContinue()
      }
    } else {
      // Validate group info
      const errors = validateGroupInfo(groupData)
      setGroupErrors(errors)
      
      // Mark all fields as touched
      const groupFields = ['groupName', 'groupType', 'industry', 'size', 'primaryStakeholders', 'desiredOutcomes', 'timelineTarget', 'constraints']
      groupFields.forEach(field => {
        setTouched(prev => ({ ...prev, [`group.${field}`]: true }))
      })

      if (errors.length === 0) {
        await onSubmitRequest()
      }
    }
  }

  // Ensure button click doesn't fire native form submission in addition to our handler
  const handlePrimaryClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    await handleContinue()
  }

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    const formData = {
      requestor: requestorData as RequestorInfo,
      group: groupData as GroupInfo
    }

    // Log to console (static submission)
    console.log('Starmap Request Submitted:', formData)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Final submit: persist title one more time (best-effort) and notify parent
    try {
      if (starmapId) {
        await updateStarmap(starmapId, {
          title: (groupData as any)?.groupName || (requestorData as any)?.fullName || null,
        } as any)
      }
    } catch {}
    onComplete?.(formData)

    // Show success message
    setShowSuccess(true)
    setIsSubmitting(false)

    // Clear saved data
    localStorage.removeItem(STORAGE_KEY)

    // Reset form after a delay
    setTimeout(() => {
      setCurrentStep('requestor')
      setRequestorData({ preferredContact: 'email' })
      setGroupData({ primaryStakeholders: [] })
      setTouched({})
      setRequestorErrors([])
      setGroupErrors([])
    }, 2000)
  }

  // Handle step click from progress indicator
  const handleStepClick = (step: FormStep) => {
    if (step === 'requestor' || isStepValid('requestor', requestorData)) {
      setCurrentStep(step)
    }
  }

  // Check if current step is valid
  const isCurrentStepValid = currentStep === 'requestor' 
    ? isStepValid('requestor', requestorData)
    : isStepValid('group', groupData)

  const direction = currentStep === 'group' ? 1 : -1

  // We keep header + container and swap inner content instead of early returns

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-white">
      <Toaster />

      <AnimatePresence mode="wait">
        {showQuestionnaire && dynamicQuestions ? (
          <motion.div
            key="dynamic-questionnaire"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <DynamicQuestionnaire
              recordId={recordId || ''}
              starmapId={starmapId}
              dynamicQuestions={dynamicQuestions}
              onComplete={(answers) => {
                console.log('Questionnaire completed:', answers)
                onComplete?.({
                  requestor: requestorData as RequestorInfo,
                  group: groupData as GroupInfo,
                  dynamicAnswers: answers
                } as any)
                navigate('/')
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="static-form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="max-w-7xl mx-auto px-4">
              <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl">
              {/* Unified header with integrated progress bar (static journey only) */}
              <QuestionnaireHeader
                icon={<Building className="w-full h-full" />}
                title={HEADER_TITLE}
                subtitle={showLoadingScreen ? getLoadingSubheading() : getStaticSubheading(currentStep)}
                useSharedContainer
                embedded
                flat
                showProgress={!showLoadingScreen}
                showDivider
              >
                <ProgressIndicator
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                  requestorComplete={isStepValid('requestor', requestorData)}
                />
              </QuestionnaireHeader>

              {/* Divider handled by header */}

              <main className="relative z-10 pt-6 pb-16">
              <div className="mt-8">
              {/* Screen reader announcements */}
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {currentStep === 'requestor' ? "Step 1 of 2: Let's get to know you!" : 'Step 2 of 2: Who are we creating for?'}
              </div>
              
              {/* Auto-save indicator */}
              <AnimatePresence>
                {showSaveIndicator && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -top-2 right-4 flex items-center gap-2 text-xs text-primary-300 bg-primary-500/10 px-3 py-1.5 rounded-full z-20"
                    role="status"
                    aria-live="polite"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Progress saved</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {showLoadingScreen ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DynamicLoadingScreen
                      embedded
                      starmapId={starmapId}
                      recordId={recordId}
                      processingLabel="Solara is Igniting the Stars for Polaris"
                      onComplete={() => {
                        setShowLoadingScreen(false)
                        setShowQuestionnaire(true)
                      }}
                      onFail={() => {
                        toast.error('Generation failed. Redirecting to home...')
                        setTimeout(() => { try { window.location.href = '/' } catch {} }, 1200)
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleContinue()
                    }}
                    className="p-6 sm:p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isExiting ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Stage Header */}
                    <div className="mb-8">
                      <AnimatePresence mode="wait" custom={currentStep}>
                        <motion.div
                          key={currentStep}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          custom={1}
                          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                        >
                          <h2 className="text-2xl font-semibold text-white mb-2">
                            {currentStep === 'requestor' ? "Let's get to know you" : 'Tell us about your team'}
                          </h2>
                          <p className="text-white/80">
                            {currentStep === 'requestor' 
                              ? 'We need some basic information to create your personalized strategy' 
                              : 'Help us understand your organization and goals'}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Form Content */}
                    <div className="relative overflow-hidden">
                      <AnimatePresence initial={false} custom={{ direction, step: currentStep }} mode="wait">
                        <motion.div
                          key={currentStep}
                          custom={{ direction, step: currentStep }}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={transition}
                          layout
                          style={{ willChange: 'transform, opacity, filter' }}
                        >
                          {currentStep === 'requestor' ? (
                            <RequestorInfoStep
                              data={requestorData}
                              onChange={updateRequestorData}
                              errors={requestorErrors}
                            />
                          ) : (
                            <GroupInfoStep
                              data={groupData}
                              onChange={updateGroupData}
                              errors={groupErrors}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="mt-10 flex items-center justify-between">
                      {/* Brand divider between form body and navigation/info */}
                      <div className="absolute left-0 right-0 -mt-8 mb-8 px-1 sm:px-2">
                        <div className="h-0.5 bg-gradient-to-r from-primary-400/0 via-primary-400/60 to-primary-400/0 rounded-full" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('requestor')}
                        disabled={currentStep === 'requestor'}
                        className={`
                          inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                          ${currentStep === 'requestor' 
                            ? 'text-white/30 cursor-not-allowed' 
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                          }
                        `}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </button>

                      <div className="flex items-center gap-3 text-sm text-white/50">
                        <span>Step {currentStep === 'requestor' ? 1 : 2} of 2</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !isCurrentStepValid}
                        onClick={handlePrimaryClick}
                        className={`
                          inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all transform
                          ${currentStep === 'group' 
                            ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                            : 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                          active:scale-95 pressable
                        `}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                            Processing...
                          </>
                        ) : currentStep === 'group' ? (
                          <>
                            Submit Request
                            <Check className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Helper Text */}
              <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-white/40">
                  Your progress is automatically saved • Reference: {starmapId || 'New Request'}
                </p>
              </motion.div>
            </div>
          </main>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessSnackbar 
        show={showSuccess} 
        onClose={() => setShowSuccess(false)} 
      />
    </div>
  )
}
