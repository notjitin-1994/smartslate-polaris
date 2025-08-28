/* Report Generation Debug store (dev only) */

type Subscriber = () => void

export type ReportDebugEventType =
  | 'job_init'
  | 'stage_saved'
  | 'save_state'
  | 'dynamic_start'
  | 'dynamic_success'
  | 'dynamic_error'
  | 'report_prompt_built'
  | 'job_submit'
  | 'resume_polling'
  | 'poll_status'
  | 'job_complete'
  | 'job_failed'
  | 'navigate_away'
  | 'navigate_back'

export type ReportDebugEntry = {
  id: string
  timestamp: string
  type: ReportDebugEventType
  jobId?: string
  step?: string
  message?: string
  progress?: number
  data?: any
  level?: 'info' | 'success' | 'error'
}

class ReportDebugStore {
  private logs: ReportDebugEntry[] = []
  private subscribers: Set<Subscriber> = new Set()
  private max = 1000

  add(entry: Omit<ReportDebugEntry, 'id' | 'timestamp'>) {
    if (!import.meta.env.DEV) return
    const row: ReportDebugEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      ...entry
    }
    this.logs.unshift(row)
    if (this.logs.length > this.max) this.logs.length = this.max
    this.emit()
  }

  info(type: ReportDebugEventType, payload?: Partial<ReportDebugEntry>) {
    this.add({ type, level: 'info', ...payload })
  }

  success(type: ReportDebugEventType, payload?: Partial<ReportDebugEntry>) {
    this.add({ type, level: 'success', ...payload })
  }

  error(type: ReportDebugEventType, payload?: Partial<ReportDebugEntry>) {
    this.add({ type, level: 'error', ...payload })
  }

  get(): ReportDebugEntry[] {
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
}

export const reportDebugStore = new ReportDebugStore()


