/* Dev-only global error tracking store and installers */

export type ErrorLogEntry = {
  id: string
  timestamp: string
  type: 'runtime' | 'unhandledrejection' | 'console' | 'boundary' | 'api' | 'manual'
  message: string
  stack?: string
  componentStack?: string
  origin?: string
  url?: string
  userAgent?: string
  errorName?: string
  statusCode?: number
  code?: string
  tags?: string[]
  context?: any
  fingerprint?: string
  breadcrumbs?: Breadcrumb[]
}

type Subscriber = () => void

class ErrorTrackerStore {
  private logs: ErrorLogEntry[] = []
  private subscribers: Set<Subscriber> = new Set()
  private max = 500
  private paused = false
  private sincePaused = 0

  add(entry: ErrorLogEntry) {
    this.logs.unshift(entry)
    if (this.logs.length > this.max) this.logs.length = this.max
    if (this.paused) {
      this.sincePaused += 1
      return
    }
    this.emit()
  }

  get(): ErrorLogEntry[] {
    return this.logs
  }

  clear() {
    this.logs = []
    this.emit()
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  private emit() {
    for (const fn of this.subscribers) fn()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!paused) {
      const had = this.sincePaused
      this.sincePaused = 0
      if (had > 0) this.emit()
    }
  }

  getPaused(): boolean {
    return this.paused
  }

  getSincePaused(): number {
    return this.sincePaused
  }
}

export const errorTrackerStore = new ErrorTrackerStore()

function nowIso(): string {
  return new Date().toISOString()
}

export type Breadcrumb = {
  id: string
  timestamp: string
  category: 'navigation' | 'api' | 'user' | 'console' | 'system' | 'custom'
  message: string
  data?: any
  level?: 'info' | 'warning' | 'error'
}

class BreadcrumbStore {
  private items: Breadcrumb[] = []
  private max = 200

  add(b: Omit<Breadcrumb, 'id' | 'timestamp'>) {
    const entry: Breadcrumb = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: nowIso(),
      ...b,
    }
    this.items.push(entry)
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max)
  }

  getRecent(limit = 50): Breadcrumb[] {
    return this.items.slice(Math.max(0, this.items.length - limit))
  }

  clear() {
    this.items = []
  }
}

export const breadcrumbs = new BreadcrumbStore()

type EnvContext = {
  mode: string
  prod: boolean
  dev: boolean
  appVersion?: string
  commit?: string
  user?: { id?: string; email?: string } | null
  locale?: string
  platform?: string
}

let envContext: EnvContext = {
  mode: import.meta.env.MODE,
  prod: !!import.meta.env.PROD,
  dev: !!import.meta.env.DEV,
  appVersion: (import.meta as any).env?.VITE_APP_VERSION,
  commit: (import.meta as any).env?.VITE_GIT_COMMIT,
  locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
  platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
  user: null,
}

export function setUserContext(user: { id?: string; email?: string } | null) {
  envContext.user = user
}

export function getEnvContext(): EnvContext {
  return envContext
}

function computeFingerprint(message: string, stack?: string, origin?: string, code?: string): string {
  const key = [message || '', origin || '', code || '', (stack || '').split('\n').slice(0, 3).join('\n')].join('|')
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return `fp_${Math.abs(hash)}`
}

function toEntry(
  error: unknown,
  opts: Partial<Omit<ErrorLogEntry, 'id' | 'timestamp' | 'message' | 'type'>> & { type: ErrorLogEntry['type'] }
): ErrorLogEntry {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let message = 'Unknown error'
  let stack: string | undefined
  let errorName: string | undefined

  if (error instanceof Error) {
    message = error.message
    stack = error.stack
    errorName = error.name
  } else if (typeof error === 'string') {
    message = error
  } else if (error && typeof error === 'object') {
    try { message = JSON.stringify(error) } catch { message = String(error) }
  }

  const fingerprint = computeFingerprint(message, stack, opts.origin, opts.code)

  return {
    id,
    timestamp: nowIso(),
    type: opts.type,
    message,
    stack,
    errorName,
    origin: opts.origin,
    url: opts.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    statusCode: opts.statusCode,
    code: opts.code,
    tags: opts.tags,
    componentStack: (opts as any).componentStack,
    context: { ...opts.context, env: getEnvContext() },
    fingerprint,
    breadcrumbs: breadcrumbs.getRecent(),
  }
}

export function reportError(
  error: unknown,
  options: Partial<Pick<ErrorLogEntry, 'type' | 'origin' | 'tags' | 'statusCode' | 'code'>> & { context?: any } = {}
) {
  if (!import.meta.env.DEV) return
  const type: ErrorLogEntry['type'] = (options.type as any) || 'manual'
  const entry = toEntry(error, {
    type,
    origin: options.origin,
    tags: options.tags,
    statusCode: options.statusCode,
    code: options.code,
    context: options.context,
  })
  errorTrackerStore.add(entry)
}

let installed = false
let originalConsoleError: ((...args: any[]) => void) | null = null
let originalConsoleWarn: ((...args: any[]) => void) | null = null

export function installGlobalErrorTracking() {
  if (!import.meta.env.DEV) return
  if (installed) return
  installed = true

  // window.onerror for runtime errors
  window.addEventListener('error', (event: ErrorEvent) => {
    try {
      reportError(event.error || event.message, {
        type: 'runtime',
        origin: 'window.onerror',
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      })
    } catch {}
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    try {
      reportError(event.reason, {
        type: 'unhandledrejection',
        origin: 'window.unhandledrejection',
      })
    } catch {}
  })

  // Patch console.error to capture manual logs
  try {
    originalConsoleError = console.error.bind(console)
    console.error = (...args: any[]) => {
      try {
        if (args.length > 0) {
          reportError(args[0] instanceof Error ? args[0] : String(args[0]), {
            type: 'console',
            origin: 'console.error',
            context: { args: args.slice(1) },
          })
        }
      } catch {}
      try { (originalConsoleError as any)(...args) } catch {}
    }
  } catch {}

  // Patch console.warn as breadcrumb
  try {
    originalConsoleWarn = console.warn.bind(console)
    console.warn = (...args: any[]) => {
      try {
        breadcrumbs.add({ category: 'console', level: 'warning', message: String(args[0] ?? 'warn'), data: { args: args.slice(1) } })
      } catch {}
      try { (originalConsoleWarn as any)(...args) } catch {}
    }
  } catch {}
}

export function uninstallGlobalErrorTracking() {
  if (!installed) return
  try { if (originalConsoleError) console.error = originalConsoleError } catch {}
  try { if (originalConsoleWarn) console.warn = originalConsoleWarn } catch {}
  installed = false
}


