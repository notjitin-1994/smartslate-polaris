import { getSupabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'

export type PolarisSummary = Database['public']['Tables']['polaris_summaries']['Row']
export type CreatePolarisSummary = Database['public']['Tables']['polaris_summaries']['Insert']

// Free tier limit for summaries
export const SUMMARY_LIMIT = 10

export async function saveSummary(data: {
  company_name: string | null
  report_title?: string | null
  summary_content: string
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

  // Check if user has reached the summary limit
  const { count, error: countError } = await getUserSummaryCount()
  if (countError) {
    return { data: null, error: countError }
  }

  if (count !== null && count >= SUMMARY_LIMIT) {
    return { 
      data: null, 
      error: new Error(`You have reached the limit of ${SUMMARY_LIMIT} summaries. Please upgrade to create more summaries.`) 
    }
  }

  const summaryData: CreatePolarisSummary = {
    user_id: user.id,
    company_name: data.company_name,
    report_title: data.report_title ?? data.company_name ?? 'Discovery Starmap',
    summary_content: data.summary_content,
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

  return { data: savedSummary, error }
}

export async function updateSummaryTitle(id: string, newTitle: string): Promise<{ error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: new Error('User not authenticated') }
  }

  const { error } = await supabase
    .from('polaris_summaries')
    .update({ report_title: newTitle })
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

  const { count, error } = await supabase
    .from('polaris_summaries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return { count, error }
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

export async function getDisplayContent(summary: PolarisSummary): string {
  // Return edited content if available, otherwise original content
  return summary.edited_content || summary.summary_content
}
