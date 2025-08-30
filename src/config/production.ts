// Production configuration for client-side deployment
import { env } from './env';

export const productionConfig = {
  // App configuration
  app: {
    name: 'Smartslate Polaris',
    version: '3.0.0-client',
    mode: 'client-only' as const,
    description: 'AI-powered learning implementation planning',
    url: env.siteUrl || 'https://polaris.smartslate.io'
  },

  // Feature flags for production
  features: {
    // Core features
    authentication: true,
    userProfiles: true,
    starmapCreation: true,
    reportGeneration: true,
    aiIntegration: true,
    
    // Advanced features
    publicSharing: true,
    dataExport: true,
    offlineMode: true,
    analytics: true,
    search: true,
    
    // Premium features (can be toggled based on subscription)
    unlimitedStarmaps: false,
    advancedAI: false,
    teamCollaboration: false,
    customBranding: false,
    apiAccess: false
  },

  // Storage configuration
  storage: {
    // IndexedDB settings
    dbName: 'smartslate-polaris',
    dbVersion: 1,
    
    // Quota management
    maxStorageSize: 100 * 1024 * 1024, // 100MB
    cleanupThreshold: 0.9, // Cleanup when 90% full
    
    // Data retention
    sessionRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    reportRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
    logRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // AI configuration
  ai: {
    enabled: true,
    defaultProvider: env.llmProvider || 'anthropic',
    maxTokensPerRequest: env.maxOutputTokens || 8000,
    maxCostPerUser: 50, // $50 per user per month
    
    // Feature-specific settings
    enableEnsemble: false,
    enableCaching: true,
    enableStreaming: true,
    
    // Safety settings
    enablePIIRedaction: true,
    enableContentFiltering: true,
    enableUsageTracking: true
  },

  // Performance settings
  performance: {
    // Lazy loading
    enableLazyLoading: true,
    lazyLoadThreshold: 0.1,
    
    // Caching
    enableServiceWorker: true,
    cacheStaticAssets: true,
    cacheApiResponses: false, // Not applicable for client-only
    
    // Bundle optimization
    enableCodeSplitting: true,
    enableTreeShaking: true,
    
    // Runtime optimization
    enableVirtualization: true,
    maxRenderItems: 50,
    debounceDelay: 300
  },

  // Security settings
  security: {
    // Data encryption
    encryptSensitiveData: true,
    encryptionKey: 'smartslate-client-key', // In production, this should be derived from user credentials
    
    // Session security
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    autoLogoutOnIdle: true,
    idleTimeout: 4 * 60 * 60 * 1000, // 4 hours
    
    // Content security
    sanitizeUserInput: true,
    validateFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.json', '.txt', '.md', '.csv']
  },

  // UI/UX settings
  ui: {
    // Theme
    defaultTheme: 'dark',
    enableThemeToggle: false, // Keep consistent dark theme
    
    // Animations
    enableAnimations: true,
    reducedMotion: false,
    animationDuration: 300,
    
    // Layout
    sidebarCollapsed: true,
    enableMobileOptimization: true,
    
    // Accessibility
    enableA11y: true,
    highContrast: false,
    largeText: false
  },

  // Analytics and monitoring
  monitoring: {
    enableErrorTracking: true,
    enablePerformanceTracking: true,
    enableUsageAnalytics: true,
    
    // Error handling
    maxErrorLogs: 100,
    errorReportingEndpoint: null, // No external reporting in client-only mode
    
    // Performance metrics
    trackPageLoad: true,
    trackUserInteractions: true,
    trackAICalls: true
  },

  // Limits and quotas
  limits: {
    // Per user limits
    maxStarmapsPerUser: 50,
    maxReportsPerUser: 100,
    maxStoragePerUser: 50 * 1024 * 1024, // 50MB
    
    // Per session limits
    maxAICallsPerSession: 100,
    maxTokensPerSession: 50000,
    
    // Content limits
    maxReportLength: 100000, // characters
    maxJobTitleLength: 200,
    maxDescriptionLength: 2000
  },

  // Backup and sync
  backup: {
    enableAutoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // Daily
    maxBackups: 7, // Keep 7 days
    
    // Export formats
    supportedFormats: ['json', 'csv', 'pdf'],
    includeAILogs: false, // Don't include sensitive AI logs in exports
  },

  // Development settings (only in dev mode)
  dev: {
    enableDebugMode: env.isDev,
    enableDevTools: env.isDev,
    enableMockData: env.isDev,
    enablePerformanceMonitoring: env.isDev,
    logLevel: env.isDev ? 'debug' : 'error'
  }
};

// Validate configuration on load
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required environment variables
  if (!env.siteUrl) {
    errors.push('VITE_SITE_URL is required for production');
  }

  // Check AI configuration
  if (productionConfig.ai.enabled && !env.openaiApiKey && !env.anthropicApiKey && !env.perplexityApiKey) {
    errors.push('At least one AI provider API key is required');
  }

  // Check storage quotas
  if (productionConfig.limits.maxStoragePerUser > productionConfig.storage.maxStorageSize) {
    errors.push('Per-user storage limit exceeds total storage limit');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get feature availability based on configuration
export function getFeatureAvailability(feature: keyof typeof productionConfig.features): boolean {
  return productionConfig.features[feature];
}

// Get current limits for user
export function getUserLimits(userType: 'free' | 'premium' = 'free'): {
  maxStarmaps: number;
  maxReports: number;
  maxStorage: number;
  aiCallsPerDay: number;
} {
  const base = productionConfig.limits;
  
  if (userType === 'premium') {
    return {
      maxStarmaps: base.maxStarmapsPerUser * 5,
      maxReports: base.maxReportsPerUser * 5,
      maxStorage: base.maxStoragePerUser * 10,
      aiCallsPerDay: base.maxAICallsPerSession * 10
    };
  }

  return {
    maxStarmaps: base.maxStarmapsPerUser,
    maxReports: base.maxReportsPerUser,
    maxStorage: base.maxStoragePerUser,
    aiCallsPerDay: base.maxAICallsPerSession
  };
}

// Initialize production environment
export async function initializeProduction(): Promise<void> {
  const validation = validateProductionConfig();
  
  if (!validation.valid) {
    console.error('Production configuration errors:', validation.errors);
    throw new Error(`Invalid production configuration: ${validation.errors.join(', ')}`);
  }

  // Initialize storage
  const { clientStorage } = await import('@/lib/clientStorage');
  await clientStorage.init();

  // Initialize services removed in client-only mode

  // Setup error handling
  if (productionConfig.monitoring.enableErrorTracking) {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      // In a real production setup, you might send this to an external service
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  // Setup performance monitoring
  if (productionConfig.monitoring.enablePerformanceTracking) {
    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      console.log('Page load time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
    });
  }

  // Setup periodic cleanup
  setInterval(async () => {
    try {
      await clientStorage.cleanupExpiredSessions();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  console.log('Production environment initialized successfully');
}
