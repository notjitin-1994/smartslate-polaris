/* Dev-only API debug interceptor and log store */

type Subscriber = () => void

export type ApiLogEntry = {
  id: string
  method: string
  url: string
  status?: number
  ok?: boolean
  durationMs?: number
  requestHeaders?: Record<string, string>
  requestBody?: any
  responseHeaders?: Record<string, string>
  responseBody?: any
  error?: string
  timestamp: string
}

class ApiDebugStore {
  private logs: ApiLogEntry[] = []
  private subscribers: Set<Subscriber> = new Set()
  private max = 500
  private paused = false
  private sincePaused = 0

  add(entry: ApiLogEntry) {
    this.logs.unshift(entry)
    if (this.logs.length > this.max) this.logs.length = this.max
    if (this.paused) {
      this.sincePaused += 1
      return
    }
    this.emit()
  }

  get(): ApiLogEntry[] {
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

export const apiDebugStore = new ApiDebugStore()
import { breadcrumbs, reportError } from '@/dev/errorTracker'

let installed = false
let originalFetch: typeof fetch | null = null

export function installApiDebugInterceptor() {
  if (!import.meta.env.DEV) return
  if (installed) return
  installed = true

  originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const start = performance.now()
    const url = typeof input === 'string' ? input : (input as URL).toString()
    const method = (init?.method || (typeof input !== 'string' && (input as Request).method) || 'GET').toUpperCase()

    const track = url.startsWith('http') || url.startsWith('/api')

    let reqHeaders: Record<string, string> | undefined
    try {
      const hdrs = init?.headers || (typeof input !== 'string' ? (input as Request).headers : undefined)
      if (hdrs && 'forEach' in (hdrs as any)) {
        const acc: Record<string, string> = {}
        ;(hdrs as Headers).forEach((v: string, k: string) => (acc[k] = v))
        reqHeaders = acc
      } else if (hdrs && typeof hdrs === 'object') {
        reqHeaders = hdrs as Record<string, string>
      }
    } catch {}

    let reqBody: any = undefined
    try {
      if (init?.body && typeof init.body === 'string') reqBody = safeParse(init.body)
    } catch {}

    try {
      const res = await (originalFetch as any)(input, init)
      const end = performance.now()
      if (!track) return res

      const clone = res.clone()
      let bodyText = ''
      try { bodyText = await clone.text() } catch {}

      const respHeaders: Record<string, string> = {}
      try { clone.headers.forEach((v: string, k: string) => (respHeaders[k] = v)) } catch {}

      apiDebugStore.add({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        method,
        url,
        status: res.status,
        ok: res.ok,
        durationMs: Math.round(end - start),
        requestHeaders: reqHeaders,
        requestBody: reqBody,
        responseHeaders: respHeaders,
        responseBody: sniffBody(bodyText),
        timestamp: new Date().toISOString(),
      })

      // Add breadcrumb for the API call
      try {
        breadcrumbs.add({
          category: 'api',
          message: `${method} ${url}`,
          data: { status: res.status, ok: res.ok, durationMs: Math.round(end - start) },
          level: res.ok ? 'info' : 'error',
        })
      } catch {}

      return res
    } catch (e: any) {
      const end = performance.now()
      if (track) {
        apiDebugStore.add({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          method,
          url,
          ok: false,
          durationMs: Math.round(end - start),
          requestHeaders: reqHeaders,
          requestBody: reqBody,
          error: e?.message || String(e),
          timestamp: new Date().toISOString(),
        })

        // Report API network-level error to tracker
        try {
          reportError(e, { type: 'api', origin: 'fetch', context: { method, url, durationMs: Math.round(end - start) } })
        } catch {}
      }
      throw e
    }
  }
}

export function uninstallApiDebugInterceptor() {
  if (!installed) return
  if (originalFetch) window.fetch = originalFetch
  installed = false
}

function safeParse(text: string): any {
  try { return JSON.parse(text) } catch { return text }
}

function sniffBody(text: string): any {
  if (!text) return ''
  const t = text.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    return safeParse(text)
  }
  return t.slice(0, 5000)
}


