import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, assertRequiredEnv } from '@/config/env'

let cachedClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient

  assertRequiredEnv()

  const supabaseUrl = env.supabaseUrl as string
  const supabaseAnonKey = env.supabaseAnonKey as string

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return cachedClient
}


