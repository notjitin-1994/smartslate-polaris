import { getSupabase } from '@/services/supabase'

function getOrCreateDeviceId(): string {
  try {
    const key = 'polaris_device_id'
    let value = localStorage.getItem(key)
    if (value && /^[0-9a-f\-]{36}$/i.test(value)) return value
    const created = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
    localStorage.setItem(key, created)
    return created
  } catch {
    // Fallback: ephemeral random
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

function getOrCreateSessionUuid(): string {
  try {
    const key = 'polaris_session_uuid'
    let value = sessionStorage.getItem(key)
    if (value && /^[0-9a-f\-]{36}$/i.test(value)) return value
    const created = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
    sessionStorage.setItem(key, created)
    return created
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export interface StartSessionParams {
  userId: string
  tokenType?: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: number | null // epoch ms
  metadata?: Record<string, any>
}

export const sessionTracker = {
  async start(params: StartSessionParams): Promise<{ sessionUuid: string }> {
    const supabase = getSupabase()
    const deviceId = getOrCreateDeviceId()
    const sessionUuid = getOrCreateSessionUuid()

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    const platform = typeof navigator !== 'undefined' ? (navigator as any).platform : undefined
    const locale = typeof navigator !== 'undefined' ? (navigator.language || (navigator as any).languages?.[0]) : undefined

    const access4 = params.accessToken ? params.accessToken.slice(-4) : null
    const refresh4 = params.refreshToken ? params.refreshToken.slice(-4) : null
    const expiresAtIso = params.expiresAt ? new Date(params.expiresAt).toISOString() : null

    await supabase.from('app_auth_sessions').upsert({
      user_id: params.userId,
      session_uuid: sessionUuid,
      device_id: deviceId,
      user_agent: userAgent,
      platform,
      locale,
      token_type: params.tokenType || 'bearer',
      access_token_last4: access4,
      refresh_token_last4: refresh4,
      expires_at: expiresAtIso,
      started_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      active: true,
      metadata: params.metadata || null
    }, { onConflict: 'session_uuid' })

    return { sessionUuid }
  },

  async touch(): Promise<void> {
    const supabase = getSupabase()
    const sessionUuid = sessionStorage.getItem('polaris_session_uuid')
    if (!sessionUuid) return
    await supabase.from('app_auth_sessions').update({ last_seen_at: new Date().toISOString() }).eq('session_uuid', sessionUuid)
  },

  async end(): Promise<void> {
    const supabase = getSupabase()
    const sessionUuid = sessionStorage.getItem('polaris_session_uuid')
    if (!sessionUuid) return
    await supabase.from('app_auth_sessions').update({ active: false, ended_at: new Date().toISOString() }).eq('session_uuid', sessionUuid)
  },

  getDeviceId(): string {
    return getOrCreateDeviceId()
  },

  getSessionUuid(): string {
    return getOrCreateSessionUuid()
  }
}


