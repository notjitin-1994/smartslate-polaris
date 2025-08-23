import { getSupabase } from '@/services/supabase'
import { env } from '@/config/env'
import { AuthError, ValidationError } from '@/lib/errors'
import type { User, Session } from '@supabase/supabase-js'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

/**
 * Validates email format
 */
function validateEmail(email: string): void {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ValidationError('Please enter a valid email address')
  }
}

/**
 * Validates password strength
 */
function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long')
  }
}

/**
 * Sign in with email and password
 */
export async function signIn({ email, password }: AuthCredentials): Promise<{ user: User; session: Session }> {
  try {
    validateEmail(email)
    
    if (!password) {
      throw new ValidationError('Password is required')
    }
    
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new AuthError('Invalid email or password')
      }
      throw new AuthError(error.message)
    }
    
    if (!data.user || !data.session) {
      throw new AuthError('Authentication failed')
    }
    
    return { user: data.user, session: data.session }
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new AuthError('An error occurred during sign in')
  }
}

/**
 * Sign up with email and password
 */
export async function signUp({ email, password }: AuthCredentials): Promise<{ user: User | null }> {
  try {
    validateEmail(email)
    validatePassword(password)
    
    const redirectTo = env.authRedirectUrl || env.siteUrl || undefined
    
    const { data, error } = await getSupabase().auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { 
        emailRedirectTo: redirectTo,
        data: {
          email_confirmed: false,
        }
      },
    })
    
    if (error) {
      if (error.message.includes('already registered')) {
        throw new ValidationError('This email is already registered')
      }
      throw new AuthError(error.message)
    }
    
    return { user: data.user }
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new AuthError('An error occurred during sign up')
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    const redirectTo = env.authRedirectUrl || `${window.location.origin}/auth/callback`
    
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    
    if (error) {
      throw new AuthError(error.message)
    }
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError('Failed to sign in with Google')
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await getSupabase().auth.signOut()
    
    if (error) {
      throw new AuthError(error.message)
    }
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }
    throw new AuthError('Failed to sign out')
  }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await getSupabase().auth.getSession()
    
    if (error) {
      throw new AuthError(error.message)
    }
    
    return data.session
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await getSupabase().auth.getUser()
    
    if (error) {
      // Not throwing here as this is often called to check if user is logged in
      return null
    }
    
    return data.user
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

/**
 * Reset password for email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    validateEmail(email)
    
    const redirectTo = `${env.siteUrl || window.location.origin}/reset-password`
    
    const { error } = await getSupabase().auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      { redirectTo }
    )
    
    if (error) {
      throw new AuthError(error.message)
    }
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new AuthError('Failed to send password reset email')
  }
}

/**
 * Update password for authenticated user
 */
export async function updatePassword(newPassword: string): Promise<void> {
  try {
    validatePassword(newPassword)
    
    const { error } = await getSupabase().auth.updateUser({
      password: newPassword,
    })
    
    if (error) {
      throw new AuthError(error.message)
    }
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new AuthError('Failed to update password')
  }
}

/**
 * Verify OTP token
 */
export async function verifyOtp(email: string, token: string): Promise<{ user: User; session: Session }> {
  try {
    validateEmail(email)
    
    if (!token || token.length !== 6) {
      throw new ValidationError('Please enter a valid 6-digit code')
    }
    
    const { data, error } = await getSupabase().auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token,
      type: 'email',
    })
    
    if (error) {
      throw new AuthError(error.message)
    }
    
    if (!data.user || !data.session) {
      throw new AuthError('Verification failed')
    }
    
    return { user: data.user, session: data.session }
  } catch (error) {
    if (error instanceof AuthError || error instanceof ValidationError) {
      throw error
    }
    throw new AuthError('Failed to verify code')
  }
}
