type AppEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_SITE_URL?: string
  VITE_AUTH_REDIRECT_URL?: string
  VITE_GOOGLE_REDIRECT_URL?: string
  MODE: string
  DEV: boolean
  PROD: boolean
}

const raw = import.meta.env as unknown as AppEnv

function read(name: keyof AppEnv): string | undefined {
  const value = raw[name]
  return typeof value === 'string' ? value : undefined
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  siteUrl: read('VITE_SITE_URL'),
  authRedirectUrl: read('VITE_AUTH_REDIRECT_URL'),
  googleRedirectUrl: read('VITE_GOOGLE_REDIRECT_URL'),
  mode: raw.MODE,
  isDev: raw.DEV,
  isProd: raw.PROD,
} as const

export function assertRequiredEnv() {
  const missing: string[] = []
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (missing.length) {
    const message = `Missing required environment variables: ${missing.join(', ')}`
    // eslint-disable-next-line no-console
    console.error(message)
    throw new Error(message)
  }
}


