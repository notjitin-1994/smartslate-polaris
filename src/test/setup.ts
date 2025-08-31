// Vitest setup: extend matchers and provide lightweight browser/test mocks
import '@testing-library/jest-dom/vitest'

// Polyfill matchMedia for components that check reduced motion or media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Provide a basic localStorage mock with in-memory store
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
}
(globalThis as any).localStorage = new MemoryStorage()

// Mock Supabase client used in forms to avoid network/env in unit tests
vi.mock('@/lib/supabaseClient', () => {
  const fakeAuth = {
    getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null })
  }
  const fakeFrom = () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: {}, error: null }) }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: '1' }, error: null }) }) }) }),
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'rec_123' }, error: null }) }) })
  })
  const supabase = {
    auth: fakeAuth,
    from: fakeFrom,
    rpc: async () => ({ error: null })
  }
  return { supabase, getSupabase: () => supabase }
})

// Mock env to prevent throws in modules that assert on required env
vi.mock('@/config/env', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    env: {
      ...actual.env,
      supabaseUrl: 'http://localhost:54321',
      supabaseAnonKey: 'anon_test_key',
      mode: 'test',
      isDev: false,
      isProd: false,
    },
    assertRequiredEnv: () => {},
    isClientOnlyMode: () => true,
  }
})

// Silence console.error noise from expected validation failures in tests
const originalError = console.error
console.error = (...args) => {
  const msg = String(args[0] ?? '')
  if (/Warning:/.test(msg) || /act\(/.test(msg)) return
  originalError(...args)
}


