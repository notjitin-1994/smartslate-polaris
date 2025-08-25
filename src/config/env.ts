type AppEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_SITE_URL?: string
  VITE_AUTH_REDIRECT_URL?: string
  VITE_GOOGLE_REDIRECT_URL?: string
  VITE_LLM_PROVIDER?: string
  VITE_OPENAI_API_KEY?: string
  VITE_OPENAI_BASE_URL?: string
  VITE_OPENAI_MODEL?: string
  VITE_ANTHROPIC_API_KEY?: string
  VITE_ANTHROPIC_BASE_URL?: string
  VITE_ANTHROPIC_MODEL?: string
  VITE_ANTHROPIC_MAX_TOKENS?: string
  VITE_PERPLEXITY_API_KEY?: string
  VITE_PERPLEXITY_BASE_URL?: string
  VITE_PERPLEXITY_MODEL?: string
  VITE_PERPLEXITY_GREETING_MODEL?: string
  VITE_PERPLEXITY_ORG_MODEL?: string
  VITE_PERPLEXITY_REQUIREMENT_MODEL?: string
  VITE_PERPLEXITY_PRELIM_MODEL?: string
  VITE_PERPLEXITY_FINAL_MODEL?: string
  VITE_UNLIMITED_STARMAPS_USER_IDS?: string
  VITE_UNLIMITED_STARMAPS_USER_EMAILS?: string
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
  llmProvider: (read('VITE_LLM_PROVIDER') || 'anthropic').toLowerCase(),
  openaiApiKey: read('VITE_OPENAI_API_KEY'),
  openaiBaseUrl: read('VITE_OPENAI_BASE_URL'),
  openaiModel: read('VITE_OPENAI_MODEL') || 'gpt-5',
  anthropicApiKey: read('VITE_ANTHROPIC_API_KEY'),
  anthropicBaseUrl: read('VITE_ANTHROPIC_BASE_URL'),
  anthropicModel: read('VITE_ANTHROPIC_MODEL') || 'claude-3-5-sonnet-latest',
  anthropicMaxTokens: read('VITE_ANTHROPIC_MAX_TOKENS'),
  perplexityApiKey: read('VITE_PERPLEXITY_API_KEY') || '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',
  perplexityBaseUrl: read('VITE_PERPLEXITY_BASE_URL') || 'https://api.perplexity.ai',
  perplexityModel: read('VITE_PERPLEXITY_MODEL') || 'llama-3.1-sonar-small-128k-online',
  perplexityGreetingModel: (read('VITE_PERPLEXITY_GREETING_MODEL') || read('VITE_PERPLEXITY_MODEL') || 'sonar'),
  perplexityOrgModel: (read('VITE_PERPLEXITY_ORG_MODEL') || 'sonar pro'),
  perplexityRequirementModel: (read('VITE_PERPLEXITY_REQUIREMENT_MODEL') || 'sonar reasoning'),
  perplexityPrelimModel: (read('VITE_PERPLEXITY_PRELIM_MODEL') || 'sonar reasoning'),
  perplexityFinalModel: (read('VITE_PERPLEXITY_FINAL_MODEL') || 'sonar reasoning'),
  unlimitedUserIds: read('VITE_UNLIMITED_STARMAPS_USER_IDS'),
  unlimitedUserEmails: read('VITE_UNLIMITED_STARMAPS_USER_EMAILS'),
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


