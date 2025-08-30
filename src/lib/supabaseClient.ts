import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

// Validate required environment variables
if (!env.supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required but not set in environment variables')
}

if (!env.supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required but not set in environment variables')
}

// Create Supabase client with standard session persistence (localStorage)
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'smartslate-auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'smartslate-web'
    }
  }
})

export const getSupabase = () => supabase
export { supabase }