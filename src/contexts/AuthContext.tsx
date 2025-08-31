import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'
import * as authService from '@/services/auth/authService'
import { AuthError, ValidationError } from '@/lib/errors'
import { paths } from '@/routes/paths'
// Dev error tracker removed
import { sessionTracker } from '@/services/sessionTracker'
import { crossDomainAuth } from '@/services/auth/crossDomainAuth'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  initializing: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  clearError: () => void
  rememberMe: boolean
  setRememberMe: (value: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Auth Provider component that manages authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const rememberMeRef = useRef<boolean>(rememberMe)

  // Keep a live reference for auth event handlers to read latest preference
  useEffect(() => {
    rememberMeRef.current = rememberMe
    try { (window as any).__SMARTSLATE_REMEMBER_ME = rememberMe } catch {}
  }, [rememberMe])
  
  // Check if user is authenticated
  const isAuthenticated = useMemo(() => !!user && !!session, [user, session])
  
  // Initialize auth state
  useEffect(() => {
    let mounted = true
    // Safety timeout: never hang on initializing more than ~1.5s
    const initTimeout = setTimeout(() => {
      if (mounted) setInitializing(false)
    }, 1500)
    
    const initAuth = async () => {
      try {
        // Check remember me preference
        const isRemembered = crossDomainAuth.isRememberMeEnabled()
        setRememberMe(isRemembered)
        
        // Try to restore session from cross-domain storage first
        const storedSession = await crossDomainAuth.getStoredSession()
        let resolvedSession: Session | null = null
        if (storedSession && mounted) {
          // Reconstruct Supabase session format
          const restoredSession: Session = {
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token,
            expires_at: storedSession.expires_at,
            expires_in: Math.max(0, storedSession.expires_at - Math.floor(Date.now() / 1000)),
            token_type: 'bearer',
            user: storedSession.user
          }
          
          // Set the session in Supabase client using token pair
          await getSupabase().auth.setSession({
            access_token: restoredSession.access_token!,
            refresh_token: restoredSession.refresh_token!,
          })
          
          setSession(restoredSession)
          setUser(storedSession.user)
          resolvedSession = restoredSession
        } else {
          // Fallback to regular session check
          const currentSession = await authService.getSession()
          
          if (mounted) {
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
          }
          resolvedSession = currentSession
        }
        
        // Start session tracking if authenticated (reuse resolved session)
        if (resolvedSession?.user && mounted) {
          try {
            sessionTracker.start({
              userId: resolvedSession.user.id,
              tokenType: 'bearer',
              accessToken: (resolvedSession as any)?.access_token,
              refreshToken: (resolvedSession as any)?.refresh_token,
              expiresAt: typeof (resolvedSession as any)?.expires_at === 'number' ? (((resolvedSession as any).expires_at as number) * 1000) : null
            })
          } catch {}
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        if (mounted) {
          setInitializing(false)
        }
      }
    }
    
    initAuth()
    
    // Subscribe to auth state changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        switch (event) {
          case 'SIGNED_IN':
            // Store session in cross-domain storage
            if (newSession) {
              await crossDomainAuth.storeSession(newSession, rememberMeRef.current)
            }
            try {
              // Ensure storage mode reflects current preference
              try { (window as any).__SMARTSLATE_REMEMBER_ME = !!rememberMeRef.current } catch {}
              if (newSession?.user) {
                sessionTracker.start({
                  userId: newSession.user.id,
                  tokenType: (newSession as any)?.token_type,
                  accessToken: (newSession as any)?.access_token,
                  refreshToken: (newSession as any)?.refresh_token,
                  expiresAt: typeof (newSession as any)?.expires_at === 'number' ? ((newSession as any).expires_at * 1000) : null
                })
              }
            } catch {}
            // Handle redirect back to the intended route if present; otherwise, let page-level logic decide
            try {
              const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
              const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth/callback')
              if (isAuthRoute) {
                const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('redirectAfterLogin') : null
                if (stored) {
                  const from = JSON.parse(stored)
                  const to = `${from?.pathname || '/'}${from?.search || ''}${from?.hash || ''}`
                  try { window.sessionStorage.removeItem('redirectAfterLogin') } catch {}
                  navigate(to, { replace: true })
                }
              }
            } catch {
            }
            break
          case 'SIGNED_OUT':
            setUser(null)
            setSession(null)
            setRememberMe(false)
            await crossDomainAuth.clearSession()
            // Ask service worker to clear caches on sign-out
            try { navigator.serviceWorker?.controller?.postMessage?.({ type: 'CLEAR_CACHE' }) } catch {}
            try { sessionTracker.end() } catch {}
            try {
              const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
              const isProtected = pathname === '/' || pathname.startsWith('/settings') || pathname.startsWith('/discover') || pathname.startsWith('/seed')
              if (isProtected) navigate('/login')
            } catch {
            }
            break
          case 'TOKEN_REFRESHED':
            try { sessionTracker.touch() } catch {}
            break
          case 'USER_UPDATED':
            if (newSession?.user) {
              setUser(newSession.user)
            }
            break
        }
      }
    )
    
    // Setup cross-tab synchronization
    const unsubscribeSync = crossDomainAuth.setupCrossTabSync(async (storedSession) => {
      if (!mounted) return
      
      if (storedSession) {
        const restoredSession: Session = {
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token,
          expires_at: storedSession.expires_at,
          expires_in: Math.max(0, storedSession.expires_at - Math.floor(Date.now() / 1000)),
          token_type: 'bearer',
          user: storedSession.user
        }
        
        // Only set on Supabase client if token actually changed
        try {
          const { data: { session: current } } = await getSupabase().auth.getSession()
          const currentToken = (current as any)?.access_token
          if (currentToken !== restoredSession.access_token) {
            await getSupabase().auth.setSession({
              access_token: restoredSession.access_token!,
              refresh_token: restoredSession.refresh_token!,
            })
          }
        } catch {}
        setSession(restoredSession)
        setUser(storedSession.user)
      } else {
        setSession(null)
        setUser(null)
        setRememberMe(false)
      }
    })
    
    return () => {
      mounted = false
      clearTimeout(initTimeout)
      subscription.unsubscribe()
      unsubscribeSync()
    }
  }, [navigate, location, rememberMe])
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Sign in
  const signIn = useCallback(async (email: string, password: string, rememberMeValue?: boolean) => {
    try {
      setError(null)
      setLoading(true)
      
      const shouldRemember = rememberMeValue ?? rememberMe
      
      const { user, session } = await authService.signIn({ email, password, rememberMe: shouldRemember })
      
      setUser(user)
      setSession(session)
      setRememberMe(shouldRemember)
      
      try {
        await sessionTracker.start({
          userId: user.id,
          tokenType: (session as any)?.token_type,
          accessToken: (session as any)?.access_token,
          refreshToken: (session as any)?.refresh_token,
          expiresAt: typeof (session as any)?.expires_at === 'number' ? ((session as any).expires_at * 1000) : null
        })
      } catch {}
    } catch (error) {
      const message = error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : 'Failed to sign in'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [rememberMe])
  
  // Sign up
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user } = await authService.signUp({ email, password, fullName })
      
      if (user) {
        setUser(user)
      }
    } catch (error) {
      const message = error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : 'Failed to sign up'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      
      await authService.signInWithGoogle()
    } catch (error) {
      const message = error instanceof AuthError
        ? error.message
        : 'Failed to sign in with Google'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null)
      
      try { await sessionTracker.end() } catch {}
      await authService.signOut()
      
      setUser(null)
      setSession(null)
    } catch (error) {
      const message = error instanceof AuthError
        ? error.message
        : 'Failed to sign out'
      setError(message)
      throw error
    }
  }, [])
  
  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null)
      setLoading(true)
      
      await authService.resetPassword(email)
    } catch (error) {
      const message = error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : 'Failed to send reset email'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setError(null)
      setLoading(true)
      
      await authService.updatePassword(newPassword)
    } catch (error) {
      const message = error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : 'Failed to update password'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      initializing,
      error,
      isAuthenticated,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      clearError,
      rememberMe,
      setRememberMe,
    }),
    [
      user,
      session,
      loading,
      initializing,
      error,
      isAuthenticated,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      clearError,
      rememberMe,
      setRememberMe,
    ]
  )
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}
