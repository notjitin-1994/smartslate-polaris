import { getSupabase } from '@/services/supabase'
import type { Database } from '@/types/database.types'

export type PolarisSummary = Database['public']['Tables']['polaris_summaries']['Row']
export type CreatePolarisSummary = Database['public']['Tables']['polaris_summaries']['Insert']

export async function saveSummary(data: {
  company_name: string | null
  summary_content: string
  stage1_answers: Record<string, any>
  stage2_answers: Record<string, any>
  stage3_answers: Record<string, any>
  stage2_questions: any[]
  stage3_questions: any[]
}): Promise<{ data: PolarisSummary | null; error: any }> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  const summaryData: CreatePolarisSummary = {
    user_id: user.id,
    company_name: data.company_name,
    summary_content: data.summary_content,
    stage1_answers: data.stage1_answers,
    stage2_answers: data.stage2_answers,
    stage3_answers: data.stage3_answers,
    stage2_questions: data.stage2_questions,
    stage3_questions: data.stage3_questions,
  }

  const { data: savedSummary, error } = await supabase
    .from('polaris_summaries')
    .insert(summaryData)
    .select()
    .single()

  return { data: savedSummary, error }
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
