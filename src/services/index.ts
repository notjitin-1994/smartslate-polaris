// Stable service exports for app imports

// Auth services (Supabase-based; app may replace provider via contexts)
export * from './auth/authService'

// Supabase client (optional in client-only mode)
export { getSupabase } from '../lib/supabaseClient'

// Removed AI services exports

// Production services removed

// Legacy/stub endpoints removed
export * from './starmaps'