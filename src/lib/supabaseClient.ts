import { createClient, type AuthSession } from '@supabase/supabase-js'
import { env } from '@/config/env'

// Validate required environment variables
if (!env.supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required but not set in environment variables')
}

if (!env.supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required but not set in environment variables')
}

// Hybrid storage adapter that respects a runtime remember-me preference.
// Defaults to localStorage; can be toggled by setting window.__SMARTSLATE_REMEMBER_ME = false
const storage = {
  getItem(key: string): string | null {
    try {
      const remember = (globalThis as any).__SMARTSLATE_REMEMBER_ME
      const driver = remember === false ? globalThis.sessionStorage : globalThis.localStorage
      return driver?.getItem?.(key) ?? null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      const remember = (globalThis as any).__SMARTSLATE_REMEMBER_ME
      const driver = remember === false ? globalThis.sessionStorage : globalThis.localStorage
      driver?.setItem?.(key, value)
    } catch {}
  },
  removeItem(key: string): void {
    try {
      globalThis.localStorage?.removeItem?.(key)
      globalThis.sessionStorage?.removeItem?.(key)
    } catch {}
  }
}

// Create Supabase client with hybrid persistence
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'smartslate-auth',
    storage: storage as Storage,
  },
  global: {
    headers: {
      'X-Client-Info': 'smartslate-web'
    }
  }
})

export const getSupabase = () => supabase
export { supabase }