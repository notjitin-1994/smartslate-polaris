// Stub for errorTracker - provides minimal functionality for frontend

export type ErrorLogEntry = {
  id: string
  timestamp: string
  error: string
  stack?: string
}

export const breadcrumbs: string[] = []

export const setUserContext = (user: any) => {
  console.log('User context set (stub):', user)
}

export const reportError = (error: Error, context?: any) => {
  console.error('Error reported (stub):', error, context)
}

class ErrorTrackerStore {
  private entries: ErrorLogEntry[] = []
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

export const errorTrackerStore = new ErrorTrackerStore()

export const installGlobalErrorTracking = () => {
  console.log('Global error tracking installed (stub)')
}
