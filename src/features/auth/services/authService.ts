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

export async function signup(params: { identifier: IdentifierValue; password: string }) {
  const { identifier, password } = params
  if (identifier.kind !== 'email') throw new Error('Enter a valid email')
  const redirectTo = env.authRedirectUrl || env.siteUrl || undefined
  const { error } = await getSupabase().auth.signUp({
    email: identifier.email,
    password,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw new Error(error.message)
}


