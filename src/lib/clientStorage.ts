// Client-side storage layer for production

// IndexedDB wrapper for robust client-side storage
class ClientStorage {
  private dbName = 'smartslate-polaris';
  private dbVersion = 2; // bump when adding new object stores
  private db: IDBDatabase | null = null;

  private requiredStores = [
    'profiles',
    'starmap_jobs',
    'reports',
    'settings',
    'sessions',
    'streaming_jobs'
  ];

  private createOrUpgradeSchema(db: IDBDatabase): void {
    // User profiles store
    if (!db.objectStoreNames.contains('profiles')) {
      const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
      profileStore.createIndex('email', 'email', { unique: true });
      profileStore.createIndex('username', 'username', { unique: false });
    }

    // Starmap jobs store
    if (!db.objectStoreNames.contains('starmap_jobs')) {
      const jobStore = db.createObjectStore('starmap_jobs', { keyPath: 'id' });
      jobStore.createIndex('user_id', 'user_id', { unique: false });
      jobStore.createIndex('status', 'status', { unique: false });
      jobStore.createIndex('created_at', 'created_at', { unique: false });
    }

    // Reports store
    if (!db.objectStoreNames.contains('reports')) {
      const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
      reportStore.createIndex('job_id', 'job_id', { unique: false });
      reportStore.createIndex('user_id', 'user_id', { unique: false });
    }

    // Settings store
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }

    // Sessions store for temporary data
    if (!db.objectStoreNames.contains('sessions')) {
      const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
      sessionStore.createIndex('expires_at', 'expires_at', { unique: false });
    }

    // Streaming jobs store
    if (!db.objectStoreNames.contains('streaming_jobs')) {
      const streamStore = db.createObjectStore('streaming_jobs', { keyPath: 'id' });
      streamStore.createIndex('jobId', 'jobId', { unique: false });
      streamStore.createIndex('userId', 'userId', { unique: false });
      streamStore.createIndex('status', 'status', { unique: false });
      streamStore.createIndex('created_at', 'created_at', { unique: false });
    }
  }

  private getMissingStores(db: IDBDatabase): string[] {
    const missing: string[] = [];
    for (const name of this.requiredStores) {
      if (!db.objectStoreNames.contains(name)) missing.push(name);
    }
    return missing;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const open = (version: number) => {
        const request = indexedDB.open(this.dbName, version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;

          // Verify schema; if stores are missing (e.g., user had older DB), bump version and upgrade
          const missing = this.getMissingStores(this.db);
          if (missing.length > 0) {
            try { this.db.close(); } catch {}
            open(version + 1);
            return;
          }

          resolve();
        };

        request.onupgradeneeded = () => {
          const db = request.result;
          this.createOrUpgradeSchema(db);
        };
      };

      open(this.dbVersion);
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    if (!this.db.objectStoreNames.contains(storeName)) {
      // Attempt a one-time upgrade to add the missing store
      this.db.close();
      this.dbVersion = Math.max(this.dbVersion, this.db.version + 1);
      await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        throw new Error(`Object store not found: ${storeName}`);
      }
    }
    return this.db.transaction([storeName], mode).objectStore(storeName);
  }

  // Generic CRUD operations
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const store = await this.getStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string, indexName?: string, value?: any): Promise<number> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = indexName 
        ? store.index(indexName).count(value)
        : store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    const store = await this.getStore('sessions', 'readwrite');
    const index = store.index('expires_at');
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(now));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Export data for backup/migration
  async exportData(): Promise<{
    profiles: any[];
    jobs: any[];
    reports: any[];
    settings: any[];
    exported_at: string;
    version: string;
  }> {
    const [profiles, jobs, reports, settings] = await Promise.all([
      this.getAll('profiles'),
      this.getAll('starmap_jobs'),
      this.getAll('reports'),
      this.getAll('settings')
    ]);

    return {
      profiles,
      jobs,
      reports,
      settings,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Import data from backup
  async importData(data: {
    profiles?: any[];
    jobs?: any[];
    reports?: any[];
    settings?: any[];
  }): Promise<void> {
    const stores = ['profiles', 'starmap_jobs', 'reports', 'settings'] as const;
    const dataKeys = ['profiles', 'jobs', 'reports', 'settings'] as const;

    for (let i = 0; i < stores.length; i++) {
      const storeName = stores[i];
      const dataKey = dataKeys[i];
      const items = data[dataKey] || [];

      for (const item of items) {
        await this.put(storeName, item);
      }
    }
  }

  // Clear all data (for logout/reset)
  async clearAllData(): Promise<void> {
    const stores = ['profiles', 'starmap_jobs', 'reports', 'settings', 'sessions'];
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Singleton instance
export const clientStorage = new ClientStorage();

// Initialize on module load
clientStorage.init().catch(console.error);

// Cleanup expired sessions periodically
setInterval(() => {
  clientStorage.cleanupExpiredSessions().catch(console.error);
}, 5 * 60 * 1000); // Every 5 minutes

// Enhanced localStorage with fallback for sensitive data
export class SecureStorage {
  private static encode(data: any): string {
    return btoa(JSON.stringify(data));
  }

  private static decode(encoded: string): any {
    try {
      return JSON.parse(atob(encoded));
    } catch {
      return null;
    }
  }

  static set(key: string, value: any, secure = false): boolean {
    try {
      const data = secure ? this.encode(value) : JSON.stringify(value);
      localStorage.setItem(key, data);
      return true;
    } catch {
      return false;
    }
  }

  static get<T>(key: string, secure = false): T | null {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return secure ? this.decode(data) : JSON.parse(data);
    } catch {
      return null;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
}

// Data synchronization utilities
export class DataSync {
  private static SYNC_KEY = 'smartslate:last_sync';
  private static CONFLICT_RESOLUTION: 'local' | 'remote' | 'merge' = 'merge';

  // Export user data for cloud backup
  static async exportUserData(userId: string): Promise<Blob> {
    const data = await clientStorage.exportData();
    const userJobs = data.jobs.filter((j: any) => j.user_id === userId);
    const userReports = data.reports.filter((r: any) => r.user_id === userId);
    const userProfile = data.profiles.find((p: any) => p.id === userId);

    const exportData = {
      user_id: userId,
      profile: userProfile,
      jobs: userJobs,
      reports: userReports,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };

    return new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
  }

  // Import user data from backup
  static async importUserData(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.profile) {
      await clientStorage.put('profiles', data.profile);
    }

    if (Array.isArray(data.jobs)) {
      for (const job of data.jobs) {
        await clientStorage.put('starmap_jobs', job);
      }
    }

    if (Array.isArray(data.reports)) {
      for (const report of data.reports) {
        await clientStorage.put('reports', report);
      }
    }

    SecureStorage.set(this.SYNC_KEY, new Date().toISOString());
  }

  // Get last sync timestamp
  static getLastSync(): Date | null {
    const timestamp = SecureStorage.get<string>(this.SYNC_KEY);
    return timestamp ? new Date(timestamp) : null;
  }
}
