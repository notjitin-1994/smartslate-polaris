// Stub for apiDebug - provides minimal functionality for frontend

export type ApiLogEntry = {
  id: string
  timestamp: string
  method: string
  url: string
  status?: number
  duration?: number
  ok?: boolean
}

class ApiDebugStore {
  private entries: ApiLogEntry[] = []
  private subscribers: Set<() => void> = new Set()

  get() {
    return this.entries
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  clear() {
    this.entries = []
    this.notify()
  }

  private notify() {
    this.subscribers.forEach(callback => callback())
  }
}

export const apiDebugStore = new ApiDebugStore()

export const installApiDebugInterceptor = () => {
  console.log('API debug interceptor installed (stub)')
}
