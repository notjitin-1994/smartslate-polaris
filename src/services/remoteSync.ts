import { getSupabase } from '@/services/supabase'

type SyncAction = 'upsert' | 'delete'

interface SyncOp {
  id: string
  table: string
  action: SyncAction
  payload?: any
  key?: { column: string; value: any }
  attempts: number
  lastAttemptAt?: string
}

class RemoteSyncManager {
  private static STORAGE_KEY = 'remote_sync_queue'
  private processing = false

  private loadQueue(): SyncOp[] {
    try { return JSON.parse(localStorage.getItem(RemoteSyncManager.STORAGE_KEY) || '[]') } catch { return [] }
  }

  private saveQueue(queue: SyncOp[]): void {
    try { localStorage.setItem(RemoteSyncManager.STORAGE_KEY, JSON.stringify(queue)) } catch {}
  }

  queue(op: Omit<SyncOp, 'id' | 'attempts'>): void {
    const queue = this.loadQueue()
    queue.push({ id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, attempts: 0, ...op })
    this.saveQueue(queue)
  }

  async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      const queue = this.loadQueue()
      if (queue.length === 0) return

      const supabase = getSupabase()
      const remaining: SyncOp[] = []

      for (const op of queue) {
        try {
          if (op.action === 'upsert') {
            if (!op.payload) throw new Error('Missing payload for upsert')
            const { error } = await supabase.from(op.table).upsert(op.payload)
            if (error) throw error
          } else if (op.action === 'delete') {
            if (!op.key) throw new Error('Missing key for delete')
            const { error } = await supabase.from(op.table).delete().eq(op.key.column, op.key.value)
            if (error) throw error
          }
        } catch (err) {
          // Exponential backoff cap at ~1h
          op.attempts += 1
          op.lastAttemptAt = new Date().toISOString()
          if (op.attempts < 8) {
            remaining.push(op)
          } else {
            console.error('Remote sync permanently failed:', op, err)
          }
        }
      }

      this.saveQueue(remaining)
    } finally {
      this.processing = false
    }
  }

  start(): void {
    // Try every 30s and on regaining online status
    setInterval(() => this.processQueue().catch(() => {}), 30_000)
    window.addEventListener('online', () => this.processQueue().catch(() => {}))
  }

  async required<T>(fn: () => Promise<T>, fallbackOp?: Omit<SyncOp, 'id' | 'attempts'>): Promise<T> {
    // Up to 3 attempts with backoff
    let delay = 400
    let lastErr: any
    for (let i = 0; i < 3; i++) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
      }
    }
    if (fallbackOp) this.queue(fallbackOp)
    throw lastErr || new Error('Remote operation failed')
  }
}

export const remoteSync = new RemoteSyncManager()
remoteSync.start()


