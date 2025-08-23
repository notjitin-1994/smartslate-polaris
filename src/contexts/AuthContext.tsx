import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'
import * as authService from '@/services/auth/authService'
import { AuthError, ValidationError } from '@/lib/errors'
import { paths } from '@/routes/paths'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  clearError: () => void
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
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Check if user is authenticated
  const isAuthenticated = useMemo(() => !!user && !!session, [user, session])
  
  // Initialize auth state
  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        const currentSession = await authService.getSession()
        
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
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
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // Navigate to home after successful sign in
            navigate(paths.home)
            break
          case 'SIGNED_OUT':
            // Clear state and navigate to login
            setUser(null)
            setSession(null)
            navigate('/login')
            break
          case 'TOKEN_REFRESHED':
            // Session refreshed successfully
            console.log('Session refreshed')
            break
          case 'USER_UPDATED':
            // User data updated
            if (newSession?.user) {
              setUser(newSession.user)
            }
            break
        }
      }
    )
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user, session } = await authService.signIn({ email, password })
      
      setUser(user)
      setSession(session)
    } catch (error) {
      const message = error instanceof AuthError || error instanceof ValidationError
        ? error.message
        : 'Failed to sign in'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const { user } = await authService.signUp({ email, password })
      
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
      setLoading(true)
      
      await authService.signOut()
      
      setUser(null)
      setSession(null)
    } catch (error) {
      const message = error instanceof AuthError
        ? error.message
        : 'Failed to sign out'
      setError(message)
      throw error
    } finally {
      setLoading(false)
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
      error,
      isAuthenticated,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      clearError,
    }),
    [
      user,
      session,
      loading,
      error,
      isAuthenticated,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      clearError,
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
