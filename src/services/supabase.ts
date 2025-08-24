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
const HANDOFF_CHUNK_SIZE = 3500 // conservative to stay under 4096 bytes per cookie

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const cookie = `${name}=${value}; Domain=.smartslate.io; Path=/; Max-Age=${maxAgeSeconds}; Secure; SameSite=Lax`
  document.cookie = cookie
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Domain=.smartslate.io; Path=/; Max-Age=0; Secure; SameSite=Lax`
}

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
    // Clear old single cookie if present
    deleteCookie(HANDOFF_COOKIE_NAME)

    // If payload fits in one cookie, write directly
    if (payload.length <= HANDOFF_CHUNK_SIZE) {
      setCookie(HANDOFF_COOKIE_NAME, payload, HANDOFF_MAX_AGE_SECONDS)
      return
    }

    // Otherwise, split into numbered chunks and write an index cookie
    const chunks: string[] = []
    for (let i = 0; i < payload.length; i += HANDOFF_CHUNK_SIZE) {
      chunks.push(payload.slice(i, i + HANDOFF_CHUNK_SIZE))
    }
    setCookie(`${HANDOFF_COOKIE_NAME}_parts`, String(chunks.length), HANDOFF_MAX_AGE_SECONDS)
    chunks.forEach((chunk, idx) => setCookie(`${HANDOFF_COOKIE_NAME}_${idx + 1}`, chunk, HANDOFF_MAX_AGE_SECONDS))
  } catch {
    // no-op
  }
}

function clearHandoffCookie() {
  try {
    // Delete possible single cookie
    deleteCookie(HANDOFF_COOKIE_NAME)
    // Delete chunked cookies if present
    const parts = readCookie(`${HANDOFF_COOKIE_NAME}_parts`)
    if (parts) {
      const count = Number(parts)
      deleteCookie(`${HANDOFF_COOKIE_NAME}_parts`)
      if (!Number.isNaN(count) && count > 0 && count < 20) {
        for (let i = 1; i <= count; i++) deleteCookie(`${HANDOFF_COOKIE_NAME}_${i}`)
      }
    } else {
      // Best-effort cleanup of a few potential chunks even if index missing
      for (let i = 1; i <= 5; i++) deleteCookie(`${HANDOFF_COOKIE_NAME}_${i}`)
    }
  } catch {
    // no-op
  }
}

function readHandoffCookie(): { at: string; rt: string } | null {
  try {
    // Try single cookie first
    const single = readCookie(HANDOFF_COOKIE_NAME)
    let b64: string | null = single || null

    // If not found, try chunked variant
    if (!b64) {
      const partsStr = readCookie(`${HANDOFF_COOKIE_NAME}_parts`)
      const count = partsStr ? Number(partsStr) : NaN
      if (!Number.isNaN(count) && count > 0 && count < 20) {
        const pieces: string[] = []
        for (let i = 1; i <= count; i++) {
          const piece = readCookie(`${HANDOFF_COOKIE_NAME}_${i}`)
          if (!piece) return null
          pieces.push(piece)
        }
        b64 = pieces.join('')
      }
    }
    if (!b64) return null
    const decoded = JSON.parse(atob(b64)) as { at?: string; rt?: string; exp?: number }
    if (!decoded.at || !decoded.rt) return null
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return { at: decoded.at, rt: decoded.rt }
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match ? match[1] : null
}

async function adoptSessionFromCookie(client: SupabaseClient) {
  const tokens = readHandoffCookie()
  if (!tokens) return
  try {
    await client.auth.setSession({ access_token: tokens.at, refresh_token: tokens.rt })
    // Ensure we fetch the freshest user metadata after adopting the session
    await client.auth.getUser()
  } finally {
    clearHandoffCookie()
  }
}

function setupCrossSubdomainHandoff(client: SupabaseClient) {
  // 1) On startup, try to adopt an existing handoff cookie (if user came from a sibling subdomain)
  void adoptSessionFromCookie(client)

  // 2) On any sign-in or token refresh, write a short-lived handoff cookie so other subdomains can import it
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      writeHandoffCookie(session)
    }
    if (event === 'SIGNED_OUT') {
      clearHandoffCookie()
    }
  })
}


