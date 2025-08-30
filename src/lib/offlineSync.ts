// Offline capabilities and sync management
import { clientStorage, SecureStorage } from './clientStorage';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface OfflineState {
  isOnline: boolean;
  lastSync: string | null;
  pendingOperations: SyncOperation[];
  syncInProgress: boolean;
}

class OfflineManager {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingOperations: [],
    syncInProgress: false
  };

  private listeners = new Set<(state: OfflineState) => void>();
  private syncQueue: SyncOperation[] = [];
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeOfflineSupport();
  }

  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Load pending operations from storage
    this.loadPendingOperations();

    // Setup periodic sync attempts
    setInterval(() => {
      if (this.state.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000); // Every 30 seconds
  }

  private async loadPendingOperations(): Promise<void> {
    try {
      const stored = SecureStorage.get<SyncOperation[]>('offline:pending_operations') || [];
      this.syncQueue = stored;
      this.updateState({ pendingOperations: stored });
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  private async savePendingOperations(): Promise<void> {
    try {
      SecureStorage.set('offline:pending_operations', this.syncQueue);
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  private handleOnline(): void {
    this.updateState({ isOnline: true });
    console.log('Connection restored - processing pending operations');
    this.processSyncQueue();
  }

  private handleOffline(): void {
    this.updateState({ isOnline: false });
    console.log('Connection lost - enabling offline mode');
  }

  private updateState(updates: Partial<OfflineState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Offline state listener error:', error);
      }
    });
  }

  // Queue operation for sync when online
  async queueOperation(
    type: SyncOperation['type'],
    table: string,
    data: any
  ): Promise<void> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      table,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending'
    };

    this.syncQueue.push(operation);
    await this.savePendingOperations();
    this.updateState({ pendingOperations: [...this.syncQueue] });

    // Try to process immediately if online
    if (this.state.isOnline) {
      this.processSyncQueue();
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<void> {
    if (this.state.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.updateState({ syncInProgress: true });

    try {
      const operations = [...this.syncQueue];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        if (operation.status === 'completed') {
          continue;
        }

        try {
          await this.processOperation(operation);
          operation.status = 'completed';
          
          // Remove completed operation from queue
          this.syncQueue = this.syncQueue.filter(op => op.id !== operation.id);
        } catch (error) {
          operation.retries++;
          operation.status = operation.retries >= this.maxRetries ? 'failed' : 'pending';
          
          if (operation.status === 'failed') {
            console.error(`Operation ${operation.id} failed permanently:`, error);
            // Remove failed operation after max retries
            this.syncQueue = this.syncQueue.filter(op => op.id !== operation.id);
          } else {
            console.warn(`Operation ${operation.id} failed, will retry:`, error);
          }
        }
      }

      await this.savePendingOperations();
      this.updateState({ 
        pendingOperations: [...this.syncQueue],
        lastSync: new Date().toISOString()
      });

    } finally {
      this.updateState({ syncInProgress: false });
    }
  }

  // Process individual sync operation
  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';
    
    // In a real implementation, this would sync with a backend
    // For client-only mode, we just ensure data is properly stored locally
    switch (operation.type) {
      case 'create':
      case 'update':
        await clientStorage.put(operation.table, operation.data);
        break;
      case 'delete':
        await clientStorage.delete(operation.table, operation.data.id);
        break;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Subscribe to offline state changes
  onStateChange(callback: (state: OfflineState) => void): () => void {
    this.listeners.add(callback);
    
    // Call immediately with current state
    callback(this.state);

    return () => {
      this.listeners.delete(callback);
    };
  }

  // Get current state
  getState(): OfflineState {
    return { ...this.state };
  }

  // Force sync attempt
  async forceSync(): Promise<void> {
    if (this.state.isOnline) {
      await this.processSyncQueue();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  // Clear all pending operations
  async clearPendingOperations(): Promise<void> {
    this.syncQueue = [];
    await this.savePendingOperations();
    this.updateState({ pendingOperations: [] });
  }

  // Get storage usage information
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    percentage: number;
    needsCleanup: boolean;
  }> {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;
      
      return {
        used,
        available: quota - used,
        percentage,
        needsCleanup: percentage > 80 // Cleanup if over 80%
      };
    } catch {
      return {
        used: 0,
        available: 0,
        percentage: 0,
        needsCleanup: false
      };
    }
  }

  // Cleanup old data to free space
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep last 30 days

    try {
      // Clean up old sessions
      await clientStorage.cleanupExpiredSessions();

      // Clean up old logs and temporary data
      const sessions = await clientStorage.getAll('sessions');
      for (const session of sessions) {
        const sessionData = session as any;
        if (new Date(sessionData.created_at) < cutoffDate) {
          await clientStorage.delete('sessions', sessionData.id);
        }
      }

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Cache management for offline support
class CacheManager {
  private cacheName = 'smartslate-polaris-v1';
  private staticAssets = [
    '/',
    '/discover',
    '/settings',
    '/pricing',
    '/manifest.json',
    '/images/logos/logo.png',
    '/images/logos/logo-swirl.png',
    '/favicon.png'
  ];

  async install(): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.addAll(this.staticAssets);
      console.log('Static assets cached for offline use');
    } catch (error) {
      console.error('Cache installation failed:', error);
    }
  }

  async handleRequest(request: Request): Promise<Response> {
    try {
      // Try network first for API calls and dynamic content
      if (request.url.includes('/api/') || request.url.includes('?')) {
        try {
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch {
          // Fallback to cache if network fails
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          throw new Error('Network failed and no cache available');
        }
      }

      // For static assets, try cache first
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fallback to network
      const networkResponse = await fetch(request);
      
      // Cache successful responses
      if (networkResponse.ok) {
        const cache = await caches.open(this.cacheName);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      console.error('Request handling failed:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await caches.delete(this.cacheName);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }
}

// Singleton instances
export const offlineManager = new OfflineManager();
export const cacheManager = new CacheManager();

// Manage service worker only in production; in dev, ensure it's unregistered
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
  }
}
