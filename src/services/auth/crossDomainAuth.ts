/**
 * Cross-domain authentication service for sharing sessions across subdomains
 * This enables SSO-like behavior across app.smartslate.io and polaris.smartslate.io
 */

import type { Session, User } from '@supabase/supabase-js'

interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

const SESSION_KEY = 'smartslate_shared_session'
const REMEMBER_ME_KEY = 'smartslate_remember_me'
const SESSION_DOMAIN = '.smartslate.io' // Allows sharing across all subdomains
const SENDER_ID_KEY = 'smartslate_auth_sender_id'
const SYNC_FALLBACK_KEY = 'smartslate_auth_sync'

export class CrossDomainAuthService {
  private static instance: CrossDomainAuthService
  private lastBroadcastToken: string | null = null
  
  private constructor() {}
  
  static getInstance(): CrossDomainAuthService {
    if (!this.instance) {
      this.instance = new CrossDomainAuthService()
    }
    return this.instance
  }

  /**
   * Store session data that can be accessed across subdomains
   */
  async storeSession(session: Session, rememberMe: boolean = false): Promise<void> {
    try {
      if (!session || !session.access_token) return

      const sessionData: StoredSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
        user: session.user
      }

      // Check previous token to avoid rebroadcasting identical tokens
      let previousToken: string | null = null
      try {
        const prevRaw = localStorage.getItem(SESSION_KEY)
        if (prevRaw) {
          const prev = JSON.parse(prevRaw) as StoredSession
          previousToken = prev?.access_token || null
        }
      } catch {}

      // Store in localStorage for immediate access (always keep current)
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true')
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
      }

      // For cross-subdomain access, broadcast only if token actually changed
      const tokenChanged = (sessionData.access_token && sessionData.access_token !== previousToken)
      if (tokenChanged && sessionData.access_token !== this.lastBroadcastToken) {
        this.lastBroadcastToken = sessionData.access_token
        this.broadcastSessionUpdate(sessionData)
      }

      // Additionally, set a secure cookie for true cross-domain support (best-effort; never throw)
      try {
        this.setSessionCookie(sessionData, rememberMe)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Skipping session cookie set:', err)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error storing session:', error)
    }
  }

  /**
   * Retrieve stored session if available and valid
   */
  async getStoredSession(): Promise<StoredSession | null> {
    try {
      // First try localStorage
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const session = JSON.parse(stored) as StoredSession
        
        // Check if session is still valid
        if (this.isSessionValid(session)) {
          return session
        }
      }

      // If not in localStorage, try to get from cookie
      const cookieSession = this.getSessionFromCookie()
      if (cookieSession && this.isSessionValid(cookieSession)) {
        // Store in localStorage for faster access
        localStorage.setItem(SESSION_KEY, JSON.stringify(cookieSession))
        return cookieSession
      }

      return null
    } catch (error) {
      console.error('Error retrieving stored session:', error)
      return null
    }
  }

  /**
   * Check if user has remember me enabled
   */
  isRememberMeEnabled(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  }

  /**
   * Clear all stored session data
   */
  async clearSession(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
    
    // Clear cookie
    this.clearSessionCookie()
    
    // Broadcast session clear
    this.broadcastSessionClear()
  }

  /**
   * Check if a session is still valid
   */
  private isSessionValid(session: StoredSession): boolean {
    if (!session || !session.access_token) return false
    
    // Check expiration with 5-minute buffer
    const now = Date.now() / 1000
    const buffer = 5 * 60 // 5 minutes
    
    return session.expires_at > (now + buffer)
  }

  /**
   * Set session cookie for cross-subdomain access
   */
  private setSessionCookie(session: StoredSession, rememberMe: boolean): void {
    if (typeof window === 'undefined') return

    // Only attempt cross-domain cookie on smartslate.io hosts
    const host = window.location.hostname.toLowerCase()
    const isSmartslateDomain = host === 'smartslate.io' || host.endsWith('.smartslate.io')

    // Calculate expiration
    const maxAge = rememberMe 
      ? 30 * 24 * 60 * 60 // 30 days for remember me
      : undefined // Session cookie if not remember me

    // Safely base64-encode JSON (UTF-8 safe)
    const json = JSON.stringify(session)
    const utf8Bytes = new TextEncoder().encode(json)
    let binary = ''
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i])
    }
    const cookieData = btoa(binary)
    
    let cookieString = `${SESSION_KEY}=${cookieData}; path=/; samesite=lax`
    if (window.location.protocol === 'https:') cookieString += '; secure'
    if (maxAge) cookieString += `; max-age=${maxAge}`
    if (isSmartslateDomain) cookieString += `; domain=${SESSION_DOMAIN}`

    // Best-effort write
    document.cookie = cookieString
  }

  /**
   * Get session from cookie
   */
  private getSessionFromCookie(): StoredSession | null {
    try {
      const cookies = document.cookie.split(';')
      const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_KEY}=`))
      
      if (sessionCookie) {
        const value = sessionCookie.split('=')[1]
        // Base64 decode into UTF-8 string
        const binary = atob(value)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const json = new TextDecoder().decode(bytes)
        return JSON.parse(json) as StoredSession
      }
      
      return null
    } catch (error) {
      console.error('Error parsing session cookie:', error)
      return null
    }
  }

  /**
   * Clear session cookie
   */
  private clearSessionCookie(): void {
    if (typeof window === 'undefined') return
    const host = window.location.hostname.toLowerCase()
    const isSmartslateDomain = host === 'smartslate.io' || host.endsWith('.smartslate.io')
    // Attempt delete with and without domain
    const base = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = base
    if (isSmartslateDomain) {
      document.cookie = `${base}; domain=${SESSION_DOMAIN}`
    }
  }

  /**
   * Broadcast session update to other tabs/windows
   */
  private broadcastSessionUpdate(session: StoredSession): void {
    try {
      const channel = new BroadcastChannel('smartslate_auth')
      channel.postMessage({ type: 'session_update', session, senderId: this.getSenderId() })
      channel.close()
    } catch (error) {
      // BroadcastChannel not supported, fallback to storage events
      window.localStorage.setItem(SYNC_FALLBACK_KEY, JSON.stringify({
        type: 'session_update',
        session,
        senderId: this.getSenderId(),
        timestamp: Date.now()
      }))
    }
  }

  /**
   * Broadcast session clear to other tabs/windows
   */
  private broadcastSessionClear(): void {
    try {
      const channel = new BroadcastChannel('smartslate_auth')
      channel.postMessage({ type: 'session_clear', senderId: this.getSenderId() })
      channel.close()
    } catch (error) {
      // BroadcastChannel not supported, fallback to storage events
      window.localStorage.setItem(SYNC_FALLBACK_KEY, JSON.stringify({
        type: 'session_clear',
        senderId: this.getSenderId(),
        timestamp: Date.now()
      }))
    }
  }

  /**
   * Listen for session updates from other tabs/windows
   */
  setupCrossTabSync(onSessionUpdate: (session: StoredSession | null) => void): () => void {
    let channel: BroadcastChannel | null = null
    const myId = this.getSenderId()
    
    try {
      // Try BroadcastChannel first
      channel = new BroadcastChannel('smartslate_auth')
      channel.onmessage = (event) => {
        const data = event?.data || {}
        if (data?.senderId && data.senderId === myId) return
        if (data.type === 'session_update') {
          // Dedup: if incoming token equals currently stored, skip
          try {
            const prevRaw = localStorage.getItem(SESSION_KEY)
            if (prevRaw) {
              const prev = JSON.parse(prevRaw) as StoredSession
              if (prev?.access_token && data?.session?.access_token && prev.access_token === data.session.access_token) {
                return
              }
            }
          } catch {}
          onSessionUpdate(data.session)
        } else if (data.type === 'session_clear') {
          onSessionUpdate(null)
        }
      }
    } catch (error) {
      // Fallback to storage events
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SYNC_FALLBACK_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue)
            if (data?.senderId && data.senderId === myId) return
            if (data.type === 'session_update') {
              // Dedup: if incoming token equals currently stored, skip
              try {
                const prevRaw = localStorage.getItem(SESSION_KEY)
                if (prevRaw) {
                  const prev = JSON.parse(prevRaw) as StoredSession
                  if (prev?.access_token && data?.session?.access_token && prev.access_token === data.session.access_token) {
                    return
                  }
                }
              } catch {}
              onSessionUpdate(data.session)
            } else if (data.type === 'session_clear') {
              onSessionUpdate(null)
            }
          } catch (error) {
            console.error('Error handling storage sync:', error)
          }
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
    
    return () => {
      channel?.close()
    }
  }

  // Generate a stable per-tab sender ID
  private getSenderId(): string {
    try {
      let id = sessionStorage.getItem(SENDER_ID_KEY)
      if (id && /^[0-9a-f\-]{8,}$/i.test(id)) return id
      const created = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? (crypto as any).randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
      sessionStorage.setItem(SENDER_ID_KEY, created)
      return created
    } catch {
      return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
  }
}

export const crossDomainAuth = CrossDomainAuthService.getInstance()
