import type { IdentifierValue } from '@/features/auth/types'
import { getSupabase } from '@/services/supabase'
import { env } from '@/config/env'

export async function login(params: { identifier: IdentifierValue; password: string }) {
  const { identifier, password } = params
  if (identifier.kind !== 'email') throw new Error('Enter a valid email')
  const { error } = await getSupabase().auth.signInWithPassword({
    email: identifier.email,
    password,
  })
  if (error) throw new Error(error.message)
}

export async function signup(params: { identifier: IdentifierValue; password: string; fullName?: string }) {
  const { identifier, password, fullName } = params
  if (identifier.kind !== 'email') throw new Error('Enter a valid email')
  const redirectTo = env.authRedirectUrl || env.siteUrl || undefined
  
  // Prepare user metadata
  const userData: Record<string, any> = {}
  
  // Add full name to user metadata if provided
  if (fullName && fullName.trim()) {
    userData.full_name = fullName.trim()
    userData.display_name = fullName.trim()
  }
  
  const { error } = await getSupabase().auth.signUp({
    email: identifier.email,
    password,
    options: { 
      emailRedirectTo: redirectTo,
      data: userData
    },
  })
  if (error) throw new Error(error.message)
}


