// Stub for reportDebug - provides minimal functionality for frontend

export type ReportDebugEntry = {
  id: string
  timestamp: string
  type: string
  content: string
}

class ReportDebugStore {
  private entries: ReportDebugEntry[] = []
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

  info(type: string, data: any) {
    console.log(`[ReportDebug] ${type}:`, data)
    this.addEntry('info', type, data)
  }

  success(type: string, data: any) {
    console.log(`[ReportDebug] SUCCESS ${type}:`, data)
    this.addEntry('success', type, data)
  }

  error(type: string, data: any) {
    console.error(`[ReportDebug] ERROR ${type}:`, data)
    this.addEntry('error', type, data)
  }

  private addEntry(level: string, type: string, data: any) {
    const entry: ReportDebugEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: `${level}:${type}`,
      content: JSON.stringify(data)
    }
    this.entries.push(entry)
    this.notify()
  }

  private notify() {
    this.subscribers.forEach(callback => callback())
  }
}

export const reportDebugStore = new ReportDebugStore()
