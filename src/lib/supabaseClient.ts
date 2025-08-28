import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

// Create Supabase client for frontend authentication
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)

export const getSupabase = () => supabase
export { supabase }