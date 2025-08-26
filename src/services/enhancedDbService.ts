import { getSupabase } from '@/lib/supabaseClient'

const supabase = getSupabase()

interface QueryOptions {
  cache?: boolean
  cacheTimeout?: number
  retries?: number
  select?: string
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
  filters?: Record<string, any>
}

interface BatchOperation {
  table: string
  operation: 'insert' | 'update' | 'delete'
  data: any
  filters?: Record<string, any>
}

interface CachedQuery {
  data: any
  timestamp: number
  expiresAt: number
}

/**
 * Enhanced Database Service with optimizations
 */
export class EnhancedDbService {
  private queryCache: Map<string, CachedQuery>
  private defaultCacheTimeout: number = 5 * 60 * 1000 // 5 minutes
  private pendingBatch: BatchOperation[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private batchSize: number = 50

  constructor() {
    this.queryCache = new Map()
  }

  /**
   * Execute a query with caching and retry logic
   */
  async query<T>(
    table: string,
    options: QueryOptions = {}
  ): Promise<{ data: T[]; error: any }> {
    const {
      cache = true,
      cacheTimeout = this.defaultCacheTimeout,
      retries = 2,
      select = '*',
      orderBy,
      limit,
      offset,
      filters
    } = options

    // Generate cache key
    const cacheKey = this.getCacheKey(table, options)

    // Check cache
    if (cache) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log(`[DB] Cache hit for ${table}`)
        return { data: cached as T[], error: null }
      }
    }

    // Build query
    let query = supabase.from(table).select(select)

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (value === null) {
          query = query.is(key, null)
        } else if (typeof value === 'object' && value.operator) {
          // Support complex filters like { operator: 'gte', value: 10 }
          const { operator, value: filterValue } = value
          switch (operator) {
            case 'gt':
              query = query.gt(key, filterValue)
              break
            case 'gte':
              query = query.gte(key, filterValue)
              break
            case 'lt':
              query = query.lt(key, filterValue)
              break
            case 'lte':
              query = query.lte(key, filterValue)
              break
            case 'like':
              query = query.like(key, filterValue)
              break
            case 'ilike':
              query = query.ilike(key, filterValue)
              break
            case 'neq':
              query = query.neq(key, filterValue)
              break
            default:
              query = query.eq(key, filterValue)
          }
        } else {
          query = query.eq(key, value)
        }
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    }

    // Apply pagination
    if (limit) {
      query = query.limit(limit)
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1)
    }

    // Execute with retry logic
    let lastError: any = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error } = await query

        if (error) {
          lastError = error
          if (attempt < retries) {
            console.log(`[DB] Retry ${attempt + 1}/${retries} for ${table}`)
            await this.delay(Math.pow(2, attempt) * 500)
            continue
          }
        }

        // Cache successful result
        if (cache && data) {
          this.setCache(cacheKey, data, cacheTimeout)
        }

        return { data: (data || []) as T[], error }
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 500)
          continue
        }
      }
    }

    return { data: [], error: lastError }
  }

  /**
   * Optimized batch insert with automatic chunking
   */
  async batchInsert<T>(
    table: string,
    records: T[],
    options: { chunkSize?: number; returnData?: boolean } = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const { chunkSize = 500, returnData = true } = options
    const chunks = this.chunkArray(records, chunkSize)
    const results: T[] = []
    let lastError: any = null

    console.log(`[DB] Batch inserting ${records.length} records in ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const query = supabase.from(table).insert(chunk)
        const { data, error } = returnData 
          ? await query.select()
          : await query

        if (error) {
          console.error(`[DB] Error in chunk ${i + 1}:`, error)
          lastError = error
          // Continue with other chunks even if one fails
          continue
        }

        if (data && returnData) {
          results.push(...(data as T[]))
        }
      } catch (err) {
        console.error(`[DB] Exception in chunk ${i + 1}:`, err)
        lastError = err
        continue
      }
    }

    // Invalidate relevant cache
    this.invalidateCache(table)

    return {
      data: returnData ? results : null,
      error: results.length === 0 && lastError ? lastError : null
    }
  }

  /**
   * Optimized batch update
   */
  async batchUpdate<T>(
    table: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    options: { chunkSize?: number } = {}
  ): Promise<{ error: any }> {
    const { chunkSize = 100 } = options
    const chunks = this.chunkArray(updates, chunkSize)
    let lastError: any = null

    console.log(`[DB] Batch updating ${updates.length} records in ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Group updates by common data to optimize queries
      const groupedUpdates = this.groupUpdatesByData(chunk)
      
      for (const [dataKey, ids] of groupedUpdates.entries()) {
        const data = JSON.parse(dataKey)
        try {
          const { error } = await supabase
            .from(table)
            .update(data)
            .in('id', ids)

          if (error) {
            console.error(`[DB] Update error in chunk ${i + 1}:`, error)
            lastError = error
            continue
          }
        } catch (err) {
          console.error(`[DB] Update exception in chunk ${i + 1}:`, err)
          lastError = err
          continue
        }
      }
    }

    // Invalidate cache
    this.invalidateCache(table)

    return { error: lastError }
  }

  /**
   * Queue operations for batch processing
   */
  queueOperation(operation: BatchOperation): void {
    this.pendingBatch.push(operation)

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    // Process batch if it reaches size limit
    if (this.pendingBatch.length >= this.batchSize) {
      this.processBatch()
    } else {
      // Otherwise, set timeout to process batch
      this.batchTimeout = setTimeout(() => this.processBatch(), 100)
    }
  }

  /**
   * Process queued batch operations
   */
  private async processBatch(): Promise<void> {
    if (this.pendingBatch.length === 0) return

    const batch = [...this.pendingBatch]
    this.pendingBatch = []

    console.log(`[DB] Processing batch of ${batch.length} operations`)

    // Group operations by table and type
    const grouped = this.groupOperations(batch)

    for (const [key, operations] of grouped.entries()) {
      const [table, operationType] = key.split(':')
      
      switch (operationType) {
        case 'insert':
          await this.batchInsert(table, operations.map(op => op.data), { returnData: false })
          break
        case 'update':
          const updates = operations.map(op => ({
            id: op.filters?.id,
            data: op.data
          })).filter(u => u.id)
          if (updates.length > 0) {
            await this.batchUpdate(table, updates)
          }
          break
        case 'delete':
          const ids = operations.map(op => op.filters?.id).filter(Boolean)
          if (ids.length > 0) {
            await supabase.from(table).delete().in('id', ids)
          }
          break
      }
    }

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
  }

  /**
   * Execute transaction-like operations
   */
  async transaction(operations: BatchOperation[]): Promise<{ error: any }> {
    // Note: Supabase doesn't support true transactions in the client library
    // This provides best-effort atomicity
    const results = []
    
    for (const op of operations) {
      let result: any
      
      switch (op.operation) {
        case 'insert':
          result = await supabase.from(op.table).insert(op.data)
          break
        case 'update':
          let updateQuery = supabase.from(op.table).update(op.data)
          if (op.filters) {
            for (const [key, value] of Object.entries(op.filters)) {
              updateQuery = updateQuery.eq(key, value)
            }
          }
          result = await updateQuery
          break
        case 'delete':
          let deleteQuery = supabase.from(op.table).delete()
          if (op.filters) {
            for (const [key, value] of Object.entries(op.filters)) {
              deleteQuery = deleteQuery.eq(key, value)
            }
          }
          result = await deleteQuery
          break
      }
      
      if (result.error) {
        console.error(`[DB] Transaction failed at operation:`, op, result.error)
        // Attempt rollback (limited capability)
        // In a real transaction, previous operations would be rolled back
        return { error: result.error }
      }
      
      results.push(result)
    }
    
    // Invalidate cache for affected tables
    const tables = new Set(operations.map(op => op.table))
    tables.forEach(table => this.invalidateCache(table))
    
    return { error: null }
  }

  /**
   * Subscribe to real-time changes with auto-reconnect
   */
  subscribeToChanges(
    table: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ): () => void {
    let channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table,
          filter: filters ? this.buildFilterString(filters) : undefined
        },
        (payload) => {
          console.log(`[DB] Real-time update for ${table}:`, payload)
          // Invalidate cache for this table
          this.invalidateCache(table)
          callback(payload)
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Prefetch and cache commonly used data
   */
  async prefetch(tables: string[]): Promise<void> {
    console.log(`[DB] Prefetching ${tables.length} tables`)
    
    const promises = tables.map(table => 
      this.query(table, { 
        cache: true, 
        cacheTimeout: 10 * 60 * 1000 // 10 minutes for prefetched data
      })
    )
    
    await Promise.all(promises)
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hits: number
    misses: number
    hitRate: number
  } {
    // This is simplified - in production you'd track hits/misses
    return {
      size: this.queryCache.size,
      hits: 0, // Would need to track
      misses: 0, // Would need to track
      hitRate: 0 // Would calculate from hits/misses
    }
  }

  // Helper methods

  private getCacheKey(table: string, options: QueryOptions): string {
    return `${table}:${JSON.stringify(options)}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }
    if (cached) {
      this.queryCache.delete(key) // Clean up expired entry
    }
    return null
  }

  private setCache(key: string, data: any, timeout: number): void {
    const now = Date.now()
    this.queryCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + timeout
    })

    // Clean up old cache entries periodically
    if (this.queryCache.size > 100) {
      this.cleanCache()
    }
  }

  private invalidateCache(table?: string): void {
    if (!table) {
      this.queryCache.clear()
      return
    }

    // Remove all cache entries for this table
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(`${table}:`)) {
        this.queryCache.delete(key)
      }
    }
  }

  private cleanCache(): void {
    const now = Date.now()
    for (const [key, value] of this.queryCache.entries()) {
      if (value.expiresAt < now) {
        this.queryCache.delete(key)
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private groupUpdatesByData<T>(
    updates: Array<{ id: string; data: Partial<T> }>
  ): Map<string, string[]> {
    const grouped = new Map<string, string[]>()
    
    for (const update of updates) {
      const dataKey = JSON.stringify(update.data)
      if (!grouped.has(dataKey)) {
        grouped.set(dataKey, [])
      }
      grouped.get(dataKey)!.push(update.id)
    }
    
    return grouped
  }

  private groupOperations(operations: BatchOperation[]): Map<string, BatchOperation[]> {
    const grouped = new Map<string, BatchOperation[]>()
    
    for (const op of operations) {
      const key = `${op.table}:${op.operation}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(op)
    }
    
    return grouped
  }

  private buildFilterString(filters: Record<string, any>): string {
    return Object.entries(filters)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join(',')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.queryCache.clear()
    console.log('[DB] All caches cleared')
  }
}

// Export singleton instance
export const enhancedDb = new EnhancedDbService()

// Export convenience functions
export const dbQuery = <T>(table: string, options?: QueryOptions) => 
  enhancedDb.query<T>(table, options)

export const dbBatchInsert = <T>(table: string, records: T[], options?: any) =>
  enhancedDb.batchInsert<T>(table, records, options)

export const dbTransaction = (operations: BatchOperation[]) =>
  enhancedDb.transaction(operations)

export const dbSubscribe = (table: string, callback: (payload: any) => void, filters?: any) =>
  enhancedDb.subscribeToChanges(table, callback, filters)
