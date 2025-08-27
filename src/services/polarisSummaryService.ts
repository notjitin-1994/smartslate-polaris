import { getSupabase } from '@/services/supabase'
import { env } from '@/config/env'
import type { Database } from '@/types/database.types'

export type PolarisSummary = Database['public']['Tables']['polaris_summaries']['Row']
export type CreatePolarisSummary = Database['public']['Tables']['polaris_summaries']['Insert']

// Limits (default personal plan: Explorer)
export const CREATION_LIMIT = 5
export const SAVED_LIMIT = 2
// Back-compat: SUMMARY_LIMIT previously meant saved summaries. Keep export alias.
export const SUMMARY_LIMIT = SAVED_LIMIT

// Usage helpers
export async function getUserCreatedCount(): Promise<{ count: number | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: null, error: new Error('User not authenticated') }

  const { data, error } = await supabase
    .from('profiles')
    .select('starmaps_created')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { count: null, error }
  let value = (data?.starmaps_created as unknown as number) ?? 0

  // Self-heal/backfill: ensure lifetime created >= current saved count
  // This fixes older accounts where the new counter wasn't populated yet.
  try {
    const { count: savedCount } = await supabase
      .from('polaris_summaries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (typeof savedCount === 'number' && savedCount > (value ?? 0)) {
      value = savedCount
      // Best-effort update; ignore error to avoid blocking
      await supabase
        .from('profiles')
        .update({ starmaps_created: savedCount })
        .eq('id', user.id)
    }
  } catch {}

  return { count: value, error: null }
}

export async function incrementUserCreatedCount(): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('User not authenticated') }

  // Read-modify-write (simple, safe for our usage volumes)
  const current = await getUserCreatedCount()
  if (current.error) return { error: current.error }
  const next = (current.count ?? 0) + 1

  const { error } = await supabase
    .from('profiles')
    .update({ starmaps_created: next })
    .eq('id', user.id)
  return { error }
}

export async function saveSummary(data: {
  company_name: string | null
  report_title?: string | null
  summary_content: string
  prelim_report?: string | null
  dynamic_questionnaire_report?: string | null
  stage1_answers: Record<string, any>
  stage2_answers: Record<string, any>
  stage3_answers: Record<string, any>
  stage2_questions: any[]
  stage3_questions: any[]
  greeting_report?: string | null
  org_report?: string | null
  requirement_report?: string | null
}): Promise<{ data: PolarisSummary | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  // Check saved summaries limit (skip for unlimited users)
  const isUnlimited = isUnlimitedUser(user.id, user.email)
  if (!isUnlimited) {
    const { count: savedCount, error: savedErr } = await getUserSummaryCount()
    if (savedErr) return { data: null, error: savedErr }
    if (savedCount !== null && savedCount >= SAVED_LIMIT) {
      return {
        data: null,
        error: new Error(`You have reached the saved starmaps limit of ${SAVED_LIMIT}. Delete some or upgrade to save more.`)
      }
    }
  }

  // Check creation limit (lifetime) — skip for unlimited users
  if (!isUnlimited) {
    const { count: createdCount, error: createdErr } = await getUserCreatedCount()
    if (createdErr) return { data: null, error: createdErr }
    if (createdCount !== null && createdCount >= CREATION_LIMIT) {
      return {
        data: null,
        error: new Error(`You have reached the creation limit of ${CREATION_LIMIT} starmaps. Please upgrade to create more.`)
      }
    }
  }

  // Compute canonical starmap title: [YYYY-MM-DD]-[Org Name]-[User's Name]
  const requesterName = (data.stage1_answers && (data.stage1_answers as any).requester_name) 
    || (user?.user_metadata as any)?.full_name 
    || (user?.email ? (user.email as string).split('@')[0] : null)
    || 'Unknown User'
  const orgName = data.company_name 
    || (data.stage2_answers && (data.stage2_answers as any).org_name)
    || 'Unknown Org'
  const createdDate = new Date().toISOString().slice(0, 10)
  const computedTitle = `${createdDate}-${String(orgName).trim()}-${String(requesterName).trim()}`

  const summaryData: CreatePolarisSummary = {
    user_id: user.id,
    company_name: data.company_name,
    // Enforce canonical naming regardless of provided report_title
    report_title: computedTitle,
    summary_content: data.summary_content,
    prelim_report: data.prelim_report ?? null,
    dynamic_questionnaire_report: data.dynamic_questionnaire_report ?? null,
    stage1_answers: data.stage1_answers,
    stage2_answers: data.stage2_answers,
    stage3_answers: data.stage3_answers,
    stage2_questions: data.stage2_questions,
    stage3_questions: data.stage3_questions,
    greeting_report: data.greeting_report ?? null,
    org_report: data.org_report ?? null,
    requirement_report: data.requirement_report ?? null,
  }

  const { data: savedSummary, error } = await supabase
    .from('polaris_summaries')
    .insert(summaryData)
    .select()
    .single()

  if (!error && savedSummary) {
    // Increment lifetime creation counter unless unlimited user (optional)
    if (!isUnlimited) {
      await incrementUserCreatedCount()
    }
  }

  return { data: savedSummary, error }
}

export async function updateSummaryTitle(id: string, _newTitle: string): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  // Load existing answers to enforce canonical naming
  const { data: existing, error: loadErr } = await supabase
    .from('polaris_summaries')
    .select('company_name, stage1_answers, stage2_answers, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (loadErr) {
    return { error: loadErr }
  }

  const requesterName = (existing?.stage1_answers && (existing.stage1_answers as any).requester_name)
    || (user?.user_metadata as any)?.full_name
    || (user?.email ? (user.email as string).split('@')[0] : null)
    || 'Unknown User'
  const orgName = existing?.company_name
    || (existing?.stage2_answers && (existing.stage2_answers as any).org_name)
    || 'Unknown Org'
  const datePart = (existing?.created_at ? String(existing.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10))
  const computedTitle = `${datePart}-${String(orgName).trim()}-${String(requesterName).trim()}`

  const { error } = await supabase
    .from('polaris_summaries')
    .update({ report_title: computedTitle })
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

export async function getRecentSummaries(limit = 3): Promise<{ data: PolarisSummary[] | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  const { data, error } = await supabase
    .from('polaris_summaries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

export async function getAllSummaries(): Promise<{ data: PolarisSummary[] | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  const { data, error } = await supabase
    .from('polaris_summaries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function getSummaryById(id: string): Promise<{ data: PolarisSummary | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  const { data, error } = await supabase
    .from('polaris_summaries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return { data, error }
}

export async function toggleReportPublicStatus(id: string): Promise<{ isPublic: boolean | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { isPublic: null, error: new Error('User not authenticated') }
  }

  try {
    // Call the database function to toggle public status
    const { data, error } = await supabase
      .rpc('toggle_report_public_status', { report_id: id })

    if (error) {
      console.error('Error toggling public status:', error)
      return { isPublic: null, error }
    }

    return { isPublic: data, error: null }
  } catch (err) {
    console.error('Failed to toggle public status:', err)
    return { isPublic: null, error: err }
  }
}

export async function getReportPublicStatus(id: string): Promise<{ isPublic: boolean | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { isPublic: null, error: new Error('User not authenticated') }
  }

  const { data, error } = await supabase
    .from('polaris_summaries')
    .select('is_public')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return { isPublic: null, error }
  }

  return { isPublic: data?.is_public ?? false, error: null }
}

export async function deleteSummary(id: string): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  const { error } = await supabase
    .from('polaris_summaries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

export async function getUserSummaryCount(): Promise<{ count: number | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { count: null, error: new Error('User not authenticated') }
  }

  // Unlimited users are exempt from saved count checks
  if (isUnlimitedUser(user.id, user.email)) {
    return { count: 0, error: null }
  }

  const { count, error } = await supabase
    .from('polaris_summaries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return { count, error }
}

// Exact saved starmaps count for display purposes (no unlimited gating)
export async function getUserSavedCountExact(): Promise<{ count: number | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { count: null, error: new Error('User not authenticated') }
  }

  // Prefer exact count; also fetch a small page to cross-check length to avoid off-by-one issues
  const { data, count, error } = await supabase
    .from('polaris_summaries')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id)
    .limit(1000)

  if (error) return { count: null, error }
  // Prefer concrete row count from returned data when available (safer for recent deletes)
  const numericCount = Array.isArray(data) ? data.length : (typeof count === 'number' ? count : 0)
  return { count: numericCount, error: null }
}

export async function updateSummaryEditedContent(
  id: string, 
  editedContent: string
): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  const { error } = await supabase
    .from('polaris_summaries')
    .update({ 
      edited_content: editedContent,
      is_edited: true,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

export async function updateSummaryPrelimReport(
  id: string,
  prelimReport: string
): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  const { error } = await supabase
    .from('polaris_summaries')
    .update({ 
      prelim_report: prelimReport,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

export async function updateSummaryFinalContent(
  id: string,
  finalContent: string,
  options: { stage2_questions?: any[]; stage3_questions?: any[]; stage3_answers_merge?: Record<string, any>; dynamic_questionnaire_report?: string | null } = {}
): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  const updatePayload: Partial<CreatePolarisSummary> = {
    summary_content: finalContent,
  }
  if (options.stage2_questions) (updatePayload as any).stage2_questions = options.stage2_questions
  if (options.stage3_questions) (updatePayload as any).stage3_questions = options.stage3_questions
  if (options.stage3_answers_merge) (updatePayload as any).stage3_answers = options.stage3_answers_merge
  if (options.dynamic_questionnaire_report !== undefined) (updatePayload as any).dynamic_questionnaire_report = options.dynamic_questionnaire_report

  const { error } = await supabase
    .from('polaris_summaries')
    .update({
      ...updatePayload,
      last_edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

// Save individual research report fields to an existing summary
export async function updateSummaryReports(
  id: string,
  reports: { greeting_report?: string | null; org_report?: string | null; requirement_report?: string | null }
): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: new Error('User not authenticated') }
  }
  const payload: Partial<CreatePolarisSummary> = {}
  if (reports.greeting_report !== undefined) (payload as any).greeting_report = reports.greeting_report
  if (reports.org_report !== undefined) (payload as any).org_report = reports.org_report
  if (reports.requirement_report !== undefined) (payload as any).requirement_report = reports.requirement_report

  const { error } = await supabase
    .from('polaris_summaries')
    .update({
      ...payload,
      last_edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  return { error }
}

export function getDisplayContent(summary: PolarisSummary): string {
  // Return edited content if available, otherwise original content
  return summary.edited_content || summary.summary_content
}

// ------------------------
// Helpers
// ------------------------
function parseCsv(input?: string): string[] {
  if (!input) return []
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isUnlimitedUser(userId?: string | null, email?: string | null): boolean {
  const ids = parseCsv(env.unlimitedUserIds)
  const emails = parseCsv(env.unlimitedUserEmails)
  if (userId && ids.includes(userId)) return true
  if (email && emails.includes(email.toLowerCase())) return true
  return false
}
