import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { createDebounce, createPerformanceThrottle, createIntersectionObserver } from '@/utils/performance'

/**
 * Hook for debouncing function calls
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  return useMemo(() => createDebounce(func, delay), [func, delay])
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  return useMemo(() => createPerformanceThrottle(func, delay, options), [func, delay, options])
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = createIntersectionObserver(callback, options)
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, options])

  return observerRef.current
}

/**
 * Hook for lazy loading components
 */
export function useLazyLoad<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0, offsetY: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  
  const virtualScroller = useMemo(() => {
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
  }, [items, itemHeight, containerHeight, overscan])

  const handleScroll = useCallback((scrollTop: number) => {
    setScrollTop(scrollTop)
    const range = virtualScroller.getVisibleRange(scrollTop)
    setVisibleRange(range)
  }, [virtualScroller])

  const visibleItems = useMemo(() => {
    return virtualScroller.getVisibleRange(scrollTop).visibleItems
  }, [virtualScroller, scrollTop])

  return {
    visibleItems,
    visibleRange,
    totalHeight: virtualScroller.getTotalHeight(),
    itemHeight: virtualScroller.getItemHeight(),
    handleScroll
  }
}

/**
 * Hook for measuring component render performance
 */
export function useRenderMeasure(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number>(0)
  const lastRenderTime = useRef<number>(0)

  useEffect(() => {
    renderCount.current++
    startTime.current = performance.now()
    
    return () => {
      const renderTime = performance.now() - startTime.current
      lastRenderTime.current = renderTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`)
      }
    }
  })

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  }
}

/**
 * Hook for optimizing expensive calculations
 */
export function useExpensiveCalculation<T>(
  factory: () => T,
  deps: any[],
  cacheKey?: string
): T {
  const cache = useRef<Map<string, T>>(new Map())
  const lastDeps = useRef<any[]>([])
  
  return useMemo(() => {
    const key = cacheKey || JSON.stringify(deps)
    
    // Check if deps have actually changed
    const depsChanged = deps.length !== lastDeps.current.length || 
      deps.some((dep, index) => dep !== lastDeps.current[index])
    
    if (!depsChanged && cache.current.has(key)) {
      return cache.current.get(key)!
    }
    
    const result = factory()
    cache.current.set(key, result)
    lastDeps.current = [...deps]
    
    return result
  }, [factory, deps, cacheKey])
}

/**
 * Hook for managing component lifecycle performance
 */
export function useComponentLifecycle(componentName: string) {
  const mountTime = useRef<number>(0)
  const updateCount = useRef(0)
  
  useEffect(() => {
    mountTime.current = performance.now()
    updateCount.current = 0
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} mounted`)
    }
    
    return () => {
      const totalTime = performance.now() - mountTime.current
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} unmounted after ${totalTime.toFixed(2)}ms (${updateCount.current} updates)`)
      }
    }
  }, [componentName])
  
  useEffect(() => {
    updateCount.current++
  })
  
  return {
    mountTime: mountTime.current,
    updateCount: updateCount.current
  }
}

/**
 * Hook for optimizing event handlers
 */
export function useOptimizedEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  options: {
    debounce?: number
    throttle?: number
    throttleOptions?: { leading?: boolean; trailing?: boolean }
  } = {}
): T {
  const { debounce, throttle, throttleOptions } = options
  
  if (debounce) {
    return useDebounce(handler, debounce)
  }
  
  if (throttle) {
    return useThrottle(handler, throttle, throttleOptions)
  }
  
  return handler
}

/**
 * Hook for memory usage monitoring
 */
export function useMemoryMonitor(enabled: boolean = false) {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)
  
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        })
      }
    }
    
    const interval = setInterval(updateMemoryInfo, 5000)
    updateMemoryInfo()
    
    return () => clearInterval(interval)
  }, [enabled])
  
  return memoryInfo
}

/**
 * Hook for bundle size monitoring
 */
export function useBundleMonitor(enabled: boolean = false) {
  const [bundleInfo, setBundleInfo] = useState<any>(null)
  
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    
    const updateBundleInfo = () => {
      if ('performance' in window) {
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
        
        setBundleInfo({
          jsFiles: jsFiles.length,
          totalSize,
          averageSize: totalSize / jsFiles.length,
          timestamp: Date.now()
        })
      }
    }
    
    // Update after page load
    if (document.readyState === 'complete') {
      updateBundleInfo()
    } else {
      window.addEventListener('load', updateBundleInfo)
      return () => window.removeEventListener('load', updateBundleInfo)
    }
  }, [enabled])
  
  return bundleInfo
}
