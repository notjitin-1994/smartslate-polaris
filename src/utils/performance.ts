/**
 * Performance monitoring utilities
 */

interface PerformanceMetrics {
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive
}

/**
 * Web Vitals monitoring
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics = {}
  private observers: Map<string, PerformanceObserver> = new Map()
  
  private constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObservers()
    }
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  private initializeObservers() {
    // Observe First Contentful Paint
    this.observePaintTiming()
    
    // Observe Largest Contentful Paint
    this.observeLCP()
    
    // Observe First Input Delay
    this.observeFID()
    
    // Observe Cumulative Layout Shift
    this.observeCLS()
    
    // Observe navigation timing
    this.observeNavigationTiming()
  }
  
  private observePaintTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = Math.round(entry.startTime)
            console.log(`FCP: ${this.metrics.fcp}ms`)
          }
        }
      })
      observer.observe({ entryTypes: ['paint'] })
      this.observers.set('paint', observer)
    } catch (e) {
      console.warn('Paint timing observation not supported')
    }
  }
  
  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          this.metrics.lcp = Math.round(lastEntry.startTime)
          console.log(`LCP: ${this.metrics.lcp}ms`)
        }
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', observer)
    } catch (e) {
      console.warn('LCP observation not supported')
    }
  }
  
  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('processingStart' in entry && 'startTime' in entry) {
            const fid = (entry as any).processingStart - entry.startTime
            this.metrics.fid = Math.round(fid)
            console.log(`FID: ${this.metrics.fid}ms`)
            // FID only needs to be captured once
            this.observers.get('fid')?.disconnect()
          }
        }
      })
      observer.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', observer)
    } catch (e) {
      console.warn('FID observation not supported')
    }
  }
  
  private observeCLS() {
    try {
      let clsValue = 0
      let clsEntries: PerformanceEntry[] = []
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsEntries.push(entry)
            clsValue += (entry as any).value
          }
        }
        this.metrics.cls = Math.round(clsValue * 1000) / 1000
        console.log(`CLS: ${this.metrics.cls}`)
      })
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', observer)
    } catch (e) {
      console.warn('CLS observation not supported')
    }
  }
  
  private observeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0]
        this.metrics.ttfb = Math.round(nav.responseStart - nav.requestStart)
        this.metrics.tti = Math.round(nav.domInteractive - nav.fetchStart)
        console.log(`TTFB: ${this.metrics.ttfb}ms, TTI: ${this.metrics.tti}ms`)
      }
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  
  logMetrics() {
    console.table(this.metrics)
  }
  
  sendMetrics(endpoint?: string) {
    // Send metrics to analytics service
    const url = endpoint || '/api/analytics/performance'
    
    if (Object.keys(this.metrics).length > 0) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      }).catch((e) => console.warn('Failed to send performance metrics:', e))
    }
  }
  
  disconnect() {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
  }
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string) {
  return function <T extends { new(...args: any[]): any }>(constructor: T) {
    return class extends constructor {
      componentDidMount() {
        performance.mark(`${componentName}-mounted`)
        performance.measure(
          `${componentName}-mount-time`,
          'navigationStart',
          `${componentName}-mounted`
        )
        const measure = performance.getEntriesByName(`${componentName}-mount-time`)[0]
        console.log(`${componentName} mounted in ${Math.round(measure.duration)}ms`)
        
        if (super.componentDidMount) {
          super.componentDidMount()
        }
      }
    }
  }
}

/**
 * Performance timing decorator for functions
 */
export function measureExecutionTime(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value
  
  descriptor.value = async function (...args: any[]) {
    const start = performance.now()
    const result = await originalMethod.apply(this, args)
    const end = performance.now()
    console.log(`${propertyKey} executed in ${Math.round(end - start)}ms`)
    return result
  }
  
  return descriptor
}

/**
 * Throttle expensive operations
 */
export function createPerformanceThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastExecTime = 0
  const { leading = true, trailing = true } = options
  
  return function (this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()
    
    if (!lastExecTime && !leading) {
      lastExecTime = now
    }
    
    const remaining = delay - (now - lastExecTime)
    
    if (remaining <= 0 || remaining > delay) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastExecTime = now
      return func.apply(context, args)
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        lastExecTime = leading ? Date.now() : 0
        timeoutId = null
        func.apply(context, args)
      }, remaining)
    }
  } as T
}

/**
 * Debounce function calls for better performance
 */
export function createDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function (this: any, ...args: Parameters<T>) {
    const context = this
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func.apply(context, args)
      timeoutId = null
    }, delay)
  } as T
}

/**
 * Intersection Observer utility for lazy loading
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }
  
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  })
}

/**
 * Virtual scrolling utility for large lists
 */
export function createVirtualScroller<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const totalHeight = items.length * itemHeight
  
  return {
    getVisibleRange(scrollTop: number) {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      )
      
      return {
        startIndex,
        endIndex,
        visibleItems: items.slice(startIndex, endIndex + 1),
        offsetY: startIndex * itemHeight
      }
    },
    
    getTotalHeight() {
      return totalHeight
    },
    
    getItemHeight() {
      return itemHeight
    }
  }
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    }
  }
  return null
}

/**
 * Bundle size analyzer
 */
export function analyzeBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entries = performance.getEntriesByType('resource')
    const jsFiles = entries.filter(entry => 
      entry.name.endsWith('.js') || entry.name.endsWith('.mjs')
    )
    
    const totalSize = jsFiles.reduce((sum, entry) => {
      if ('transferSize' in entry) {
        return sum + (entry as any).transferSize
      }
      return sum
    }, 0)
    
    return {
      jsFiles: jsFiles.length,
      totalSize,
      averageSize: totalSize / jsFiles.length
    }
  }
  return null
}

/**
 * Component render optimization utilities
 */
export const renderOptimizations = {
  /**
   * Memoize expensive calculations
   */
  memoize<T>(factory: () => T, deps: any[]): T {
    const key = JSON.stringify(deps)
    if (!renderOptimizations._cache.has(key)) {
      renderOptimizations._cache.set(key, factory())
    }
    return renderOptimizations._cache.get(key) as T
  },
  
  /**
   * Clear memoization cache
   */
  clearCache() {
    renderOptimizations._cache.clear()
  },
  
  _cache: new Map<string, any>()
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()
