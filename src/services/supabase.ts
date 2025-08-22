import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
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
  // Attach cross-subdomain cookie handoff only in browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    setupCrossSubdomainHandoff(cachedClient)
  }
  return cachedClient
}

// ------------------------
// Cross-subdomain session handoff
// ------------------------
const HANDOFF_COOKIE_NAME = 'ss_handoff'
const HANDOFF_MAX_AGE_SECONDS = 90 // keep this very short-lived

function writeHandoffCookie(session: Session | null) {
  if (!session?.access_token || !session?.refresh_token) return
  try {
    const payload = btoa(
      JSON.stringify({
        at: session.access_token,
        rt: session.refresh_token,
        exp: Math.floor(Date.now() / 1000) + HANDOFF_MAX_AGE_SECONDS,
      })
    )
    // Write for parent domain so sibling subdomains can read once
    const cookie = `${HANDOFF_COOKIE_NAME}=${payload}; Domain=.smartslate.io; Path=/; Max-Age=${HANDOFF_MAX_AGE_SECONDS}; Secure; SameSite=Lax`
    document.cookie = cookie
  } catch {
    // no-op
  }
}

function clearHandoffCookie() {
  try {
    document.cookie = `${HANDOFF_COOKIE_NAME}=; Domain=.smartslate.io; Path=/; Max-Age=0; Secure; SameSite=Lax`
  } catch {
    // no-op
  }
}

function readHandoffCookie(): { at: string; rt: string } | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${HANDOFF_COOKIE_NAME}=([^;]+)`))
    if (!match) return null
    const decoded = JSON.parse(atob(match[1])) as { at?: string; rt?: string; exp?: number }
    if (!decoded.at || !decoded.rt) return null
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return { at: decoded.at, rt: decoded.rt }
  } catch {
    return null
  }
}

async function adoptSessionFromCookie(client: SupabaseClient) {
  const tokens = readHandoffCookie()
  if (!tokens) return
  try {
    await client.auth.setSession({ access_token: tokens.at, refresh_token: tokens.rt })
  } finally {
    clearHandoffCookie()
  }
}

function setupCrossSubdomainHandoff(client: SupabaseClient) {
  // 1) On startup, try to adopt an existing handoff cookie (if user came from a sibling subdomain)
  void adoptSessionFromCookie(client)

  // 2) On any sign-in or token refresh, write a short-lived handoff cookie so other subdomains can import it
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      writeHandoffCookie(session)
    }
    if (event === 'SIGNED_OUT') {
      clearHandoffCookie()
    }
  })
}


