import { getSupabase } from '@/services/supabase'
import { buildUpdatePayloadFromFormDynamic } from '@/services/starmapSchema'

// Flexible row shape to work with existing master_discovery schema
export type StarmapRow = {
  id: string
  user_id?: string
  created_at?: string
  updated_at?: string
  title?: string | null
  session_title?: string | null
  company_name?: string | null
  name?: string | null
  status?: string | null
  progress_percentage?: number | null
  form_data?: any
  static_answers?: any
  [key: string]: any
}

export type StarmapSummaryRow = StarmapRow

// Deprecated helper retained for reference; not used with master_discovery

export async function createStarmapDraft(params?: {
  userId?: string
}): Promise<StarmapRow> {
  const supabase = getSupabase()
  const userId = params?.userId ?? (await supabase.auth.getSession()).data.session?.user?.id
  if (!userId) throw new Error('Not authenticated')

  // Insert minimal fields to avoid unknown column errors
  const { data, error } = await supabase
    .from('master_discovery')
    .insert({ user_id: userId, status: 'draft' } as any)
    .select('*')
    .single()

  if (error) throw error
  return data as unknown as StarmapRow
}

export async function listUserStarmaps(params?: { userId?: string }): Promise<StarmapSummaryRow[]> {
  const supabase = getSupabase()
  let userId = params?.userId
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')
    userId = session.user.id
  }

  const { data, error } = await supabase
    .from('master_discovery')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as StarmapSummaryRow[]
}

export async function getStarmapById(id: string): Promise<StarmapRow | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('master_discovery')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if ((error as any)?.code === 'PGRST116') return null
    throw error
  }
  return data as StarmapRow
}

export async function updateStarmap(id: string, updates: any): Promise<StarmapRow> {
  const supabase = getSupabase()
  // Discover existing columns conservatively by probing one row (no RPC dependency)
  let allowed = new Set<string>()
  const probe = await supabase.from('master_discovery').select('*').limit(1)
  const sample = (probe.data && probe.data[0]) ? Object.keys(probe.data[0]) : []
  allowed = new Set(sample)
  const payload = buildUpdatePayloadFromFormDynamic({
    requestor: updates?.requestor,
    group: updates?.group,
  }, allowed)
  // Also include top-level fields present in updates if they are real columns
  for (const [k, v] of Object.entries(updates || {})) {
    if (k === 'requestor' || k === 'group') continue
    if (allowed.has(k) && v !== undefined) (payload as any)[k] = v
  }

  // If nothing to update, exit early to avoid errors
  if (Object.keys(payload).length === 0) {
    return { id } as StarmapRow
  }

  const { error } = await supabase
    .from('master_discovery')
    .update(payload)
    .eq('id', id)
  // Do not select to avoid PGRST116 when 0 rows are changed by RLS
  if (error) throw error
  return ({ id, ...payload } as any) as StarmapRow
}

export async function removeStarmap(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('master_discovery')
    .delete()
    .eq('id', id)
  if (error) throw error
}


